from flask import (
    Flask,
    render_template,
    jsonify,
    request,
    session,
    redirect
)

import mysql.connector
from mysql.connector import Error


app = Flask(__name__)

# Used to securely maintain the student's login session.
# Change this to a longer random value later.
app.secret_key = "collegevote-secret-key-2026"


# =========================================
# MYSQL DATABASE CONNECTION
# =========================================

def get_db_connection():

    try:

        connection = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="college_voting",
            port=3306
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
# LOGIN PAGE
# =========================================

@app.route("/login", methods=["GET", "POST"])
def login():

    # -----------------------------
    # SHOW LOGIN PAGE
    # -----------------------------

    if request.method == "GET":

        return render_template(
            "login.html"
        )


    # -----------------------------
    # GET FORM DATA
    # -----------------------------

    student_id = request.form.get(
        "student_id",
        ""
    ).strip()

    password = request.form.get(
        "password",
        ""
    )


    # -----------------------------
    # BASIC VALIDATION
    # -----------------------------

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


        # -----------------------------
        # FIND STUDENT
        # -----------------------------

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


        # -----------------------------
        # STUDENT NOT FOUND
        # -----------------------------

        if student is None:

            cursor.close()
            connection.close()

            return render_template(
                "login.html",
                error="Invalid Student ID or password."
            )


        # -----------------------------
        # CHECK PASSWORD
        # -----------------------------

        if password != student["password"]:

            cursor.close()
            connection.close()

            return render_template(
                "login.html",
                error="Invalid Student ID or password."
            )


        # -----------------------------
        # CHECK WHETHER ALREADY VOTED
        # -----------------------------

        if student["has_voted"]:

            cursor.close()
            connection.close()

            return render_template(
                "login.html",
                error="You have already voted."
            )


        # -----------------------------
        # CREATE LOGIN SESSION
        # -----------------------------

        session["student_id"] = student["student_id"]

        session["student_name"] = student["name"]

        session["student_db_id"] = student["id"]


        cursor.close()

        connection.close()


        # -----------------------------
        # LOGIN SUCCESS
        # -----------------------------

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

    # Student must be logged in.

    if "student_id" not in session:

        return redirect("/login")


    return render_template(
        "index.html"
    )


# =========================================
# GET CANDIDATES FROM MYSQL
# =========================================

@app.route("/api/candidates")
def get_candidates():

    connection = get_db_connection()


    if connection is None:

        return jsonify({
            "success": False,
            "message":
                "Database connection failed"
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

@app.route("/api/vote", methods=["POST"])
def cast_vote():

    # -------------------------------------
    # CHECK LOGIN
    # -------------------------------------

    if "student_id" not in session:

        return jsonify({
            "success": False,
            "message": "Please login first."
        }), 401


    # -------------------------------------
    # GET DATA FROM REQUEST
    # -------------------------------------

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

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "message": "Invalid candidate ID."
        }), 400


    student_id = session["student_id"]


    # -------------------------------------
    # CONNECT TO DATABASE
    # -------------------------------------

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
        # CHECK STUDENT
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
        # CHECK IF ALREADY VOTED
        # ---------------------------------

        if student["has_voted"]:

            connection.rollback()

            return jsonify({
                "success": False,
                "message": "You have already voted."
            }), 409


        # ---------------------------------
        # CHECK CANDIDATE
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
        # INCREASE CANDIDATE VOTE COUNT
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


        # ---------------------------------
        # SAVE EVERYTHING
        # ---------------------------------

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


        # Duplicate student vote protection
        if getattr(e, "errno", None) == 1062:

            return jsonify({

                "success": False,

                "message":
                    "You have already voted."

            }), 409


        return jsonify({

            "success": False,

            "message":
                "Unable to record your vote."

        }), 500


    except Exception as e:

        connection.rollback()

        print(
            "Vote error:",
            e
        )


        return jsonify({

            "success": False,

            "message":
                "Something went wrong."

        }), 500


    finally:

        if cursor:

            cursor.close()

        connection.close()
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
# LOGOUT
# =========================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/login")


# =========================================
# RUN FLASK
# =========================================

if __name__ == "__main__":

    app.run(
        debug=True
    )