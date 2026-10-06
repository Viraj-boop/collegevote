from flask import (
    Flask,
    render_template,
    jsonify,
    request,
    session,
    redirect
)

import os
import secrets

from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error


# =========================================
# LOAD ENVIRONMENT VARIABLES
# =========================================

load_dotenv()


# =========================================
# FLASK APP
# =========================================

app = Flask(__name__)

app.secret_key = os.getenv(
    "SECRET_KEY",
    "collegevote-dev-secret-change-this"
)


# =========================================
# MYSQL DATABASE CONNECTION
# =========================================

def get_db_connection():

    try:

        connection = mysql.connector.connect(

            host=os.getenv("DB_HOST"),

            user=os.getenv("DB_USER"),

            password=os.getenv("DB_PASSWORD"),

            database=os.getenv("DB_NAME"),

            port=int(
                os.getenv("DB_PORT", 3306)
            ),

            ssl_disabled=False,

            ssl_verify_cert=False,

            ssl_verify_identity=False
        )

        return connection

    except Error as e:

        print(
            "MySQL Connection Error:",
            e
        )

        return None


# =========================================
# HOME PAGE
# =========================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================
# STUDENT LOGIN
# =========================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    if request.method == "GET":

        return render_template(
            "login.html"
        )


    student_id = request.form.get(
        "student_id",
        ""
    ).strip()


    password = request.form.get(
        "password",
        ""
    )


    if not student_id or not password:

        return render_template(
            "login.html",
            error="Please enter your Student ID and password."
        )


    connection = get_db_connection()


    if connection is None:

        return render_template(
            "login.html",
            error="Database connection failed."
        )


    try:

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                id,
                student_id,
                name,
                password,
                has_voted
            FROM students
            WHERE student_id = %s
            """,
            (student_id,)
        )


        student = cursor.fetchone()


        if student is None:

            cursor.close()
            connection.close()

            return render_template(
                "login.html",
                error="Invalid Student ID or password."
            )


        if password != student["password"]:

            cursor.close()
            connection.close()

            return render_template(
                "login.html",
                error="Invalid Student ID or password."
            )


        if student["has_voted"]:

            cursor.close()
            connection.close()

            return render_template(
                "login.html",
                error="You have already voted."
            )


        # ---------------------------------
        # CREATE STUDENT SESSION
        # ---------------------------------

        session["student_id"] = student["student_id"]

        session["student_name"] = student["name"]

        session["student_db_id"] = student["id"]


        cursor.close()

        connection.close()


        return redirect("/vote")


    except Error as e:

        print(
            "Login database error:",
            e
        )


        return render_template(
            "login.html",
            error="Something went wrong. Please try again."
        )


# =========================================
# VOTING PAGE
# =========================================

@app.route("/vote")
def vote_page():

    if "student_id" not in session:

        return redirect("/login")


    return render_template(
        "index.html"
    )


# =========================================
# GET CANDIDATES
# =========================================

@app.route("/api/candidates")
def get_candidates():

    connection = get_db_connection()


    if connection is None:

        return jsonify({
            "success": False,
            "message": "Database connection failed"
        }), 500


    try:

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                id,
                name,
                department,
                position,
                votes
            FROM candidates
            ORDER BY id ASC
            """
        )


        candidates = cursor.fetchall()


        cursor.close()

        connection.close()


        return jsonify({

            "success": True,

            "candidates": candidates

        })


    except Error as e:

        print(
            "Database Error:",
            e
        )


        return jsonify({

            "success": False,

            "message": str(e)

        }), 500


# =========================================
# CAST VOTE
# =========================================

@app.route(
    "/api/vote",
    methods=["POST"]
)
def cast_vote():

    if "student_id" not in session:

        return jsonify({

            "success": False,

            "message": "Please login first."

        }), 401


    data = request.get_json()


    if not data or "candidate_id" not in data:

        return jsonify({

            "success": False,

            "message": "Candidate ID is required."

        }), 400


    try:

        candidate_id = int(
            data["candidate_id"]
        )

    except (
        ValueError,
        TypeError
    ):

        return jsonify({

            "success": False,

            "message": "Invalid candidate ID."

        }), 400


    student_id = session["student_id"]


    connection = get_db_connection()


    if connection is None:

        return jsonify({

            "success": False,

            "message": "Database connection failed."

        }), 500


    cursor = None


    try:

        cursor = connection.cursor(
            dictionary=True
        )


        # ---------------------------------
        # LOCK STUDENT
        # ---------------------------------

        cursor.execute(
            """
            SELECT
                id,
                student_id,
                name,
                has_voted
            FROM students
            WHERE student_id = %s
            FOR UPDATE
            """,
            (student_id,)
        )


        student = cursor.fetchone()


        if student is None:

            connection.rollback()

            return jsonify({

                "success": False,

                "message": "Student account not found."

            }), 404


        # ---------------------------------
        # ALREADY VOTED
        # ---------------------------------

        if student["has_voted"]:

            connection.rollback()

            return jsonify({

                "success": False,

                "message": "You have already voted."

            }), 409


        # ---------------------------------
        # LOCK CANDIDATE
        # ---------------------------------

        cursor.execute(
            """
            SELECT
                id,
                name,
                position
            FROM candidates
            WHERE id = %s
            FOR UPDATE
            """,
            (candidate_id,)
        )


        candidate = cursor.fetchone()


        if candidate is None:

            connection.rollback()

            return jsonify({

                "success": False,

                "message": "Candidate not found."

            }), 404


        # ---------------------------------
        # INSERT VOTE
        # ---------------------------------

        cursor.execute(
            """
            INSERT INTO votes
            (
                student_id,
                candidate_id
            )
            VALUES
            (
                %s,
                %s
            )
            """,
            (
                student_id,
                candidate_id
            )
        )


        # ---------------------------------
        # INCREASE VOTE COUNT
        # ---------------------------------

        cursor.execute(
            """
            UPDATE candidates
            SET votes = votes + 1
            WHERE id = %s
            """,
            (candidate_id,)
        )


        # ---------------------------------
        # MARK STUDENT AS VOTED
        # ---------------------------------

        cursor.execute(
            """
            UPDATE students
            SET has_voted = TRUE
            WHERE student_id = %s
            """,
            (student_id,)
        )


        connection.commit()


        return jsonify({

            "success": True,

            "message": "Vote submitted successfully.",

            "candidate": {

                "id": candidate["id"],

                "name": candidate["name"],

                "position": candidate["position"]

            }

        })


    except mysql.connector.Error as e:

        connection.rollback()


        print(
            "Vote database error:",
            e
        )


        if getattr(e, "errno", None) == 1062:

            return jsonify({

                "success": False,

                "message": "You have already voted."

            }), 409


        return jsonify({

            "success": False,

            "message": "Unable to record your vote."

        }), 500


    except Exception as e:

        connection.rollback()


        print(
            "Vote error:",
            e
        )


        return jsonify({

            "success": False,

            "message": "Something went wrong."

        }), 500


    finally:

        if cursor:

            cursor.close()

        connection.close()


# =========================================
# ADMIN LOGIN
# =========================================

@app.route(
    "/admin/login",
    methods=["GET", "POST"]
)
def admin_login():

    if session.get("admin_logged_in"):

        return redirect("/admin/dashboard")


    if request.method == "GET":

        return render_template(
            "admin_login.html"
        )


    username = request.form.get(
        "username",
        ""
    ).strip()


    password = request.form.get(
        "password",
        ""
    )


    admin_username = os.getenv(
        "ADMIN_USERNAME"
    )

    admin_password = os.getenv(
        "ADMIN_PASSWORD"
    )


    if not admin_username or not admin_password:

        return render_template(
            "admin_login.html",
            error="Admin credentials are not configured."
        )


    username_valid = secrets.compare_digest(
        username,
        admin_username
    )


    password_valid = secrets.compare_digest(
        password,
        admin_password
    )


    if not username_valid or not password_valid:

        return render_template(
            "admin_login.html",
            error="Invalid admin credentials."
        )


    session["admin_logged_in"] = True

    session["admin_username"] = admin_username


    return redirect(
        "/admin/dashboard"
    )


# =========================================
# ADMIN DASHBOARD
# =========================================

@app.route("/admin/dashboard")
def admin_dashboard():

    if not session.get("admin_logged_in"):

        return redirect(
            "/admin/login"
        )


    connection = get_db_connection()


    if connection is None:

        return render_template(
            "admin_dashboard.html",
            error="Database connection failed."
        )


    try:

        cursor = connection.cursor(
            dictionary=True
        )


        # =================================
        # TOTAL STUDENTS
        # =================================

        cursor.execute(
            """
            SELECT COUNT(*) AS total_students
            FROM students
            """
        )


        total_students = cursor.fetchone()[
            "total_students"
        ]


        # =================================
        # STUDENTS WHO VOTED
        # =================================

        cursor.execute(
            """
            SELECT COUNT(*) AS voted_students
            FROM students
            WHERE has_voted = TRUE
            """
        )


        voted_students = cursor.fetchone()[
            "voted_students"
        ]


        # =================================
        # TOTAL VOTES
        # =================================

        cursor.execute(
            """
            SELECT COUNT(*) AS total_votes
            FROM votes
            """
        )


        total_votes = cursor.fetchone()[
            "total_votes"
        ]


        # =================================
        # TURNOUT
        # =================================

        if total_students > 0:

            turnout = round(
                (
                    voted_students /
                    total_students
                ) * 100,
                1
            )

        else:

            turnout = 0


        # =================================
        # CANDIDATE RESULTS
        # =================================

        cursor.execute(
            """
            SELECT
                id,
                name,
                department,
                position,
                votes
            FROM candidates
            ORDER BY votes DESC, id ASC
            """
        )


        candidates = cursor.fetchall()


        # =================================
        # TOTAL VOTES FOR PERCENTAGE
        # =================================

        vote_total = sum(
            candidate["votes"] or 0
            for candidate in candidates
        )


        for candidate in candidates:

            candidate_votes = (
                candidate["votes"] or 0
            )


            if vote_total > 0:

                candidate["percentage"] = round(
                    (
                        candidate_votes /
                        vote_total
                    ) * 100,
                    1
                )

            else:

                candidate["percentage"] = 0


        # =================================
        # CURRENT LEADER
        # =================================

        leader = (
            candidates[0]
            if candidates and vote_total > 0
            else None
        )


        # =================================
        # RECENT VOTES
        # =================================

        cursor.execute(
            """
            SELECT
                v.id,
                v.student_id,
                c.name AS candidate_name,
                c.position AS candidate_position,
                v.created_at
            FROM votes v
            INNER JOIN candidates c
                ON v.candidate_id = c.id
            ORDER BY v.created_at DESC
            LIMIT 20
            """
        )


        recent_votes = cursor.fetchall()


        # =================================
        # MASK STUDENT IDS
        # =================================

        for vote in recent_votes:

            student_id = str(
                vote["student_id"]
            )


            if len(student_id) > 3:

                vote["masked_student_id"] = (
                    student_id[:3]
                    + "***"
                )

            else:

                vote["masked_student_id"] = (
                    "***"
                )


        cursor.close()

        connection.close()


        return render_template(

            "admin_dashboard.html",

            total_students=total_students,

            voted_students=voted_students,

            total_votes=total_votes,

            turnout=turnout,

            candidates=candidates,

            leader=leader,

            recent_votes=recent_votes,

            vote_total=vote_total

        )


    except Error as e:

        print(
            "Admin dashboard database error:",
            e
        )


        cursor.close()

        connection.close()


        return render_template(
            "admin_dashboard.html",
            error="Unable to load election data."
        )


# =========================================
# ADMIN LOGOUT
# =========================================

@app.route("/admin/logout")
def admin_logout():

    session.pop(
        "admin_logged_in",
        None
    )

    session.pop(
        "admin_username",
        None
    )


    return redirect(
        "/admin/login"
    )


# =========================================
# DATABASE TEST
# =========================================

@app.route("/db-test")
def database_test():

    connection = get_db_connection()


    if connection is None:

        return """
        <h1>
            ❌ Database Connection Failed
        </h1>
        """


    try:

        cursor = connection.cursor()


        cursor.execute(
            "SELECT COUNT(*) FROM candidates"
        )


        result = cursor.fetchone()


        candidate_count = result[0]


        cursor.close()

        connection.close()


        return f"""
        <h1>
            ✅ Database Connected Successfully!
        </h1>

        <p>
            MySQL connection is working.
        </p>

        <p>
            Candidates in database:
            <strong>
                {candidate_count}
            </strong>
        </p>
        """


    except Error as e:

        return f"""
        <h1>
            ❌ Database Query Failed
        </h1>

        <p>
            {e}
        </p>
        """


# =========================================
# STUDENT LOGOUT
# =========================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect(
        "/login"
    )


# =========================================
# RUN FLASK
# =========================================

if __name__ == "__main__":

    app.run(
        debug=True
    )