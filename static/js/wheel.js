document.addEventListener("DOMContentLoaded", async () => {

    /* =====================================
       ELEMENTS
    ===================================== */

    const wheel =
        document.getElementById("candidateWheel");

    const currentNumber =
        document.getElementById("currentNumber");

    const totalNumber =
        document.getElementById("totalNumber");

    const panelNumber =
        document.getElementById("panelNumber");

    const panelTotal =
        document.getElementById("panelTotal");

    const candidateName =
        document.getElementById("candidateName");

    const candidatePosition =
        document.getElementById("candidatePosition");

    const candidateDepartment =
        document.getElementById("candidateDepartment");

    const candidateDescription =
        document.getElementById("candidateDescription");

    const voteButton =
        document.getElementById("voteButton");

    const modal =
        document.getElementById("voteModal");

    const modalClose =
        document.getElementById("modalClose");

    const modalCancel =
        document.getElementById("modalCancel");

    const modalConfirm =
        document.getElementById("modalConfirm");

    const modalCandidateName =
        document.getElementById("modalCandidateName");

    const modalCandidatePosition =
        document.getElementById(
            "modalCandidatePosition"
        );


    /* =====================================
       STATE
    ===================================== */

    let candidates = [];

    let activeIndex = 0;

    let rotation = 0;

    let isAnimating = false;

    let scrollLock = false;

    let selectedCandidate = null;


    const radius = 245;


    /* =====================================
       LOAD CANDIDATES FROM FLASK / MYSQL
    ===================================== */

    async function loadCandidates() {

        try {

            const response =
                await fetch("/api/candidates");

            if (!response.ok) {

                throw new Error(
                    "Failed to load candidates."
                );

            }

            const data =
                await response.json();

            if (
                !data.success ||
                !Array.isArray(data.candidates)
            ) {

                throw new Error(
                    "Invalid candidate data."
                );

            }

            candidates =
                data.candidates;


            if (candidates.length === 0) {

                throw new Error(
                    "No candidates found in database."
                );

            }


            initializeWheel();

        } catch (error) {

            console.error(
                "Candidate loading error:",
                error
            );

            wheel.innerHTML = `
                <div style="
                    position:absolute;
                    inset:0;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    font-family:monospace;
                    color:#777;
                    padding:30px;
                ">
                    Unable to load candidates.
                </div>
            `;

        }

    }


    /* =====================================
       INITIALIZE WHEEL
    ===================================== */

    function initializeWheel() {

        const candidateCount =
            candidates.length;

        const angleStep =
            360 / candidateCount;


        totalNumber.textContent =
            String(candidateCount)
                .padStart(2, "0");

        panelTotal.textContent =
            String(candidateCount)
                .padStart(2, "0");


        wheel.innerHTML = "";


        /* =====================================
           CREATE CANDIDATE ITEMS
        ===================================== */

        candidates.forEach(
            (candidate, index) => {

                const item =
                    document.createElement("div");

                item.className =
                    "wheel-candidate";

                item.dataset.index =
                    index;


                const photo =
                    document.createElement("div");

                photo.className =
                    "wheel-photo";

                photo.textContent =
                    "PHOTO";


                const name =
                    document.createElement("div");

                name.className =
                    "wheel-name";

                name.textContent =
                    candidate.name;


                item.appendChild(photo);

                item.appendChild(name);

                wheel.appendChild(item);

            }
        );


        positionCandidates(
            angleStep
        );


        updateActiveCandidate();


        /*
         * Make sure the first candidate
         * is visually active.
         */

        const firstCandidate =
            wheel.querySelector(
                ".wheel-candidate"
            );

        if (firstCandidate) {

            firstCandidate.classList.add(
                "active"
            );

        }

    }


    /* =====================================
       POSITION CANDIDATES
    ===================================== */

    function positionCandidates(
        angleStep
    ) {

        const wheelCandidates =
            document.querySelectorAll(
                ".wheel-candidate"
            );


        wheelCandidates.forEach(
            (item, index) => {

                const angle =
                    index * angleStep;


                item.style.transform =
                    `
                    rotate(${angle}deg)
                    translateY(-${radius}px)
                    rotate(${-angle}deg)
                    `;

            }
        );

    }


    /* =====================================
       ROTATE WHEEL
    ===================================== */

    function rotateWheel(direction) {

        if (isAnimating) {

            return;

        }


        const nextIndex =
            activeIndex + direction;


        /*
         * Don't rotate beyond the
         * first candidate.
         */

        if (nextIndex < 0) {

            return;

        }


        /*
         * Don't rotate beyond the
         * last candidate.
         */

        if (
            nextIndex >= candidates.length
        ) {

            return;

        }


        isAnimating = true;


        activeIndex =
            nextIndex;


        const angleStep =
            360 / candidates.length;


        rotation =
            -(activeIndex * angleStep);


        wheel.style.transform =
            `rotate(${rotation}deg)`;


        updateActiveCandidate();


        setTimeout(
            () => {

                isAnimating =
                    false;

            },
            850
        );

    }


    /* =====================================
       UPDATE ACTIVE CANDIDATE
    ===================================== */

    function updateActiveCandidate() {

        const wheelCandidates =
            document.querySelectorAll(
                ".wheel-candidate"
            );


        wheelCandidates.forEach(
            (item, index) => {

                item.classList.toggle(
                    "active",
                    index === activeIndex
                );

            }
        );


        const candidate =
            candidates[activeIndex];


        if (!candidate) {

            return;

        }


        const number =
            String(
                activeIndex + 1
            ).padStart(2, "0");


        currentNumber.textContent =
            number;


        panelNumber.textContent =
            number;


        candidateName.textContent =
            candidate.name;


        candidatePosition.textContent =
            candidate.position;


        candidateDepartment.textContent =
            candidate.department;


        /*
         * Your current database doesn't have
         * a description column, so we create
         * a simple description automatically.
         */

        candidateDescription.textContent =
            `Representing ${
                candidate.department
            } and working toward a better
            campus experience for students.`;


        voteButton.dataset.candidateId =
            candidate.id;


        /*
         * Small animation for the
         * vote button.
         */

        voteButton.style.transform =
            "translateX(20px)";


        setTimeout(
            () => {

                voteButton.style.transform =
                    "translateX(0)";

            },
            50
        );

    }


    /* =====================================
       WHEEL SCROLL CONTROL
    ===================================== */

    window.addEventListener(
        "wheel",
        (event) => {

            const votingSection =
                document.querySelector(
                    ".voting-experience"
                );


            const rect =
                votingSection.getBoundingClientRect();


            const insideVotingSection =
                rect.top <= 100 &&
                rect.bottom >=
                    window.innerHeight - 100;


            /*
             * Outside voting section:
             * allow normal page scrolling.
             */

            if (!insideVotingSection) {

                return;

            }


            /*
             * Candidate 1 + scroll UP
             * = leave voting section.
             */

            const tryingToLeaveTop =
                activeIndex === 0 &&
                event.deltaY < 0;


            /*
             * Last candidate + scroll DOWN
             * = leave voting section.
             */

            const tryingToLeaveBottom =
                activeIndex ===
                    candidates.length - 1 &&
                event.deltaY > 0;


            if (
                tryingToLeaveTop ||
                tryingToLeaveBottom
            ) {

                return;

            }


            /*
             * Wheel still has candidates
             * to reveal.
             */

            event.preventDefault();


            if (scrollLock) {

                return;

            }


            scrollLock = true;


            if (event.deltaY > 0) {

                rotateWheel(1);

            } else {

                rotateWheel(-1);

            }


            setTimeout(
                () => {

                    scrollLock = false;

                },
                900
            );

        },
        {
            passive: false
        }
    );


    /* =====================================
       KEYBOARD SUPPORT
    ===================================== */

    window.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "ArrowDown"
            ) {

                rotateWheel(1);

            }


            if (
                event.key === "ArrowUp"
            ) {

                rotateWheel(-1);

            }

        }
    );


    /* =====================================
       OPEN VOTE MODAL
    ===================================== */

    voteButton.addEventListener(
        "click",
        () => {

            selectedCandidate =
                candidates[activeIndex];


            if (!selectedCandidate) {

                return;

            }


            modalCandidateName.textContent =
                selectedCandidate.name;


            modalCandidatePosition.textContent =
                selectedCandidate.position;


            modal.classList.add(
                "open"
            );


            document.body.style.overflow =
                "hidden";

        }
    );


    /* =====================================
       CLOSE MODAL
    ===================================== */

    function closeModal() {

        modal.classList.remove(
            "open"
        );


        document.body.style.overflow =
            "";

    }


    modalClose.addEventListener(
        "click",
        closeModal
    );


    modalCancel.addEventListener(
        "click",
        closeModal
    );


    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                closeModal();

            }

        }
    );


   /* =====================================
   SUBMIT VOTE TO FLASK + MYSQL
===================================== */

modalConfirm.addEventListener(
    "click",
    async () => {

        if (!selectedCandidate) {
            return;
        }

        // Prevent multiple clicks
        modalConfirm.disabled = true;

        const originalText = modalConfirm.textContent;

        modalConfirm.textContent = "SUBMITTING...";

        try {

            const response = await fetch(
                "/api/vote",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        candidate_id:
                            selectedCandidate.id
                    })
                }
            );


            const data =
                await response.json();


            /* ==============================
               SUCCESS
            ============================== */

            if (response.ok && data.success) {

                closeModal();

                alert(
                    `✓ Vote submitted successfully!\n\nYou voted for ${selectedCandidate.name} for ${selectedCandidate.position}.\n\nYour vote has been recorded.`
                );


                /*
                 * Disable voting after successful vote.
                 */

                voteButton.disabled = true;

                voteButton.textContent =
                    "VOTE SUBMITTED";

                voteButton.style.opacity =
                    "0.5";

                voteButton.style.pointerEvents =
                    "none";


                /*
                 * Prevent further wheel voting.
                 */

                scrollLock = true;


                /*
                 * Update button state permanently
                 * for this page session.
                 */

                voteButton.dataset.voted =
                    "true";


                return;
            }


            /* ==============================
               ALREADY VOTED
            ============================== */

            if (response.status === 409) {

                closeModal();

                alert(
                    "You have already voted.\n\nEach student can vote only once."
                );

                voteButton.disabled = true;

                voteButton.textContent =
                    "ALREADY VOTED";

                voteButton.style.opacity =
                    "0.5";

                voteButton.style.pointerEvents =
                    "none";

                scrollLock = true;

                return;
            }


            /* ==============================
               OTHER SERVER ERROR
            ============================== */

            closeModal();

            alert(
                data.message ||
                "Unable to submit your vote. Please try again."
            );

        }

        catch (error) {

            console.error(
                "Vote submission error:",
                error
            );


            alert(
                "Unable to connect to the voting server.\n\nPlease make sure Flask is running and try again."
            );

        }

        finally {

            /*
             * Re-enable button only if the vote
             * wasn't successfully submitted.
             */

            if (
                voteButton.dataset.voted !== "true"
            ) {

                modalConfirm.disabled =
                    false;

                modalConfirm.textContent =
                    originalText;
            }

        }

    }
);
    /* =====================================
       START
    ===================================== */

    await loadCandidates();

});