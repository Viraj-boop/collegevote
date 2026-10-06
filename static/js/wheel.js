/* =========================================
   COLLEGEVOTE — CANDIDATE WHEEL SYSTEM
   FULL ENHANCED VERSION
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       DOM ELEMENTS
    ========================================== */

    const candidateWheel =
        document.getElementById("candidateWheel");

    const candidatePhoto =
        document.getElementById("candidatePhoto");

    const candidateName =
        document.getElementById("candidateName");

    const candidatePosition =
        document.getElementById("candidatePosition");

    const candidateDepartment =
        document.getElementById("candidateDepartment");

    const candidateDescription =
        document.getElementById("candidateDescription");

    const currentNumber =
        document.getElementById("currentNumber");

    const totalNumber =
        document.getElementById("totalNumber");

    const panelNumber =
        document.getElementById("panelNumber");

    const panelTotal =
        document.getElementById("panelTotal");

    const voteButton =
        document.getElementById("voteButton");

    const voteModal =
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
        document.getElementById("modalCandidatePosition");

    const votingExperience =
        document.querySelector(".voting-experience");

    const wheelArea =
        document.querySelector(".wheel-area");


    /* =========================================
       SAFETY CHECK
    ========================================== */

    if (!candidateWheel) {
        console.error(
            "CollegeVote: #candidateWheel was not found."
        );

        return;
    }


    /* =========================================
       STATE
    ========================================== */

    let candidates = [];

    let activeIndex = 0;

    let isAnimating = false;

    let wheelLocked = false;

    let touchStartY = 0;

    let lastWheelTime = 0;


    /* =========================================
       CONFIGURATION
    ========================================== */

    const wheelRadius = 250;

    const wheelAnimationDuration = 650;

    const wheelSensitivity = 35;


    /* =========================================
       CANDIDATE IMAGES
    ========================================== */

    const candidateImages = {

        "Arjun Sharma":
            "/static/images/arjun.jpg",

        "Priya Patil":
            "/static/images/priya.jpg",

        "Rohan Joshi":
            "/static/images/rohan.jpg",

        "Sneha Kulkarni":
            "/static/images/sneha.jpg",

        "Aditya Deshmukh":
            "/static/images/aditya.jpg"

    };


    /* =========================================
       CANDIDATE DESCRIPTIONS
    ========================================== */

    const descriptions = {

        "Arjun Sharma":
            "Building a stronger, smarter and more connected campus for every student.",

        "Priya Patil":
            "Creating a more inclusive campus where every student's voice is heard.",

        "Rohan Joshi":
            "Focused on transparency, student representation and meaningful change.",

        "Sneha Kulkarni":
            "Bringing creativity, culture and unforgettable experiences to campus life.",

        "Aditya Deshmukh":
            "Promoting a healthier, more active and competitive student community."

    };


    /* =========================================
       LOAD CANDIDATES
    ========================================== */

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

            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load candidates."
                );

            }

            candidates =
                data.candidates || [];

            if (!candidates.length) {

                console.warn(
                    "No candidates found."
                );

                return;

            }

            const total =
                String(candidates.length)
                    .padStart(2, "0");

            if (totalNumber) {
                totalNumber.textContent = total;
            }

            if (panelTotal) {
                panelTotal.textContent = total;
            }

            buildWheel();

            updateCandidate(0, true);

        } catch (error) {

            console.error(
                "Candidate loading error:",
                error
            );

        }

    }


    /* =========================================
       BUILD WHEEL
    ========================================== */

    function buildWheel() {

        candidateWheel.innerHTML = "";

        candidates.forEach(
            (candidate, index) => {

                const card =
                    document.createElement("div");

                card.className =
                    "wheel-candidate";

                card.dataset.index =
                    index;

                card.innerHTML = `

                    <div class="wheel-candidate-number">
                        ${String(index + 1).padStart(2, "0")}
                    </div>

                    <div class="wheel-candidate-name">
                        ${escapeHTML(candidate.name)}
                    </div>

                    <div class="wheel-candidate-position">
                        ${escapeHTML(candidate.position || "")}
                    </div>

                `;

                card.addEventListener(
                    "click",
                    () => {

                        if (
                            isAnimating ||
                            index === activeIndex
                        ) {
                            return;
                        }

                        goToCandidate(index);

                    }
                );

                candidateWheel.appendChild(card);

            }
        );

        positionWheel();

    }


    /* =========================================
       POSITION WHEEL
    ========================================== */

    function positionWheel() {

        const cards =
            candidateWheel.querySelectorAll(
                ".wheel-candidate"
            );

        const total =
            cards.length;

        if (!total) {
            return;
        }

        cards.forEach(
            (card, index) => {

                /*
                    Calculate position relative
                    to currently selected candidate.
                */

                let relative =
                    index - activeIndex;

                /*
                    Wrap candidates around the circle.
                */

                if (relative > total / 2) {
                    relative -= total;
                }

                if (relative < -total / 2) {
                    relative += total;
                }

                const angle =
                    relative * (360 / total);

                const radians =
                    angle * Math.PI / 180;

                const x =
                    Math.sin(radians) *
                    wheelRadius;

                const y =
                    -Math.cos(radians) *
                    wheelRadius;

                /*
                    Selected candidate becomes
                    visually dominant.
                */

                const isActive =
                    relative === 0;

                const scale =
                    isActive
                        ? 1
                        : 0.72;

                const opacity =
                    isActive
                        ? 1
                        : 0.42;

                const zIndex =
                    isActive
                        ? 30
                        : 5;

                card.style.transform = `
                    translate(-50%, -50%)
                    translate3d(
                        ${x}px,
                        ${y}px,
                        0
                    )
                    scale(${scale})
                `;

                card.style.opacity =
                    opacity;

                card.style.zIndex =
                    zIndex;

                card.classList.toggle(
                    "active",
                    isActive
                );

            }
        );

    }


    /* =========================================
       UPDATE ACTIVE CANDIDATE
    ========================================== */

    function updateCandidate(
        index,
        instant = false
    ) {

        if (!candidates.length) {
            return;
        }

        if (
            index < 0 ||
            index >= candidates.length
        ) {
            return;
        }

        activeIndex =
            index;

        const candidate =
            candidates[activeIndex];

        const number =
            String(activeIndex + 1)
                .padStart(2, "0");

        /*
            HEADER COUNTER
        */

        if (currentNumber) {
            currentNumber.textContent =
                number;
        }

        /*
            PANEL COUNTER
        */

        if (panelNumber) {
            panelNumber.textContent =
                number;
        }

        /*
            CANDIDATE POSITION
        */

        if (candidatePosition) {

            candidatePosition.textContent =
                candidate.position ||
                "CANDIDATE";

        }

        /*
            CANDIDATE NAME
        */

        if (candidateName) {

            candidateName.textContent =
                candidate.name ||
                "Unknown Candidate";

        }

        /*
            DEPARTMENT
        */

        if (candidateDepartment) {

            candidateDepartment.textContent =
                candidate.department ||
                "";

        }

        /*
            DESCRIPTION
        */

        if (candidateDescription) {

            candidateDescription.textContent =
                descriptions[candidate.name] ||
                "Working to make campus life better for every student.";

        }

        /*
            CENTER PHOTO
        */

        updatePhoto(
            candidate,
            instant
        );

        /*
            MOVE WHEEL
        */

        positionWheel();

        /*
            MODAL
        */

        updateModal(
            candidate
        );

        /*
            BUTTON
        */

        updateVoteButton();

    }


    /* =========================================
       UPDATE CENTER PHOTO
    ========================================== */

    function updatePhoto(
        candidate,
        instant = false
    ) {

        if (!candidatePhoto) {
            return;
        }

        const imagePath =
            candidateImages[candidate.name];

        /*
            Remove old photo smoothly.
        */

        if (!instant) {

            candidatePhoto.classList.add(
                "photo-changing"
            );

        }

        const loadImage = () => {

            candidatePhoto.innerHTML = "";

            if (!imagePath) {

                candidatePhoto.innerHTML =
                    "<span>PHOTO</span>";

                candidatePhoto.classList.remove(
                    "photo-changing"
                );

                return;

            }

            const image =
                document.createElement("img");

            image.src =
                imagePath;

            image.alt =
                candidate.name;

            image.draggable =
                false;

            image.onload = () => {

                candidatePhoto.innerHTML = "";

                candidatePhoto.appendChild(
                    image
                );

                /*
                    Make sure the selected
                    candidate is always visible
                    in the center.
                */

                candidatePhoto.classList.remove(
                    "photo-changing"
                );

            };

            image.onerror = () => {

                console.error(
                    "Could not load image:",
                    imagePath
                );

                candidatePhoto.innerHTML =
                    "<span>PHOTO</span>";

                candidatePhoto.classList.remove(
                    "photo-changing"
                );

            };

            /*
                Append immediately so the browser
                starts loading the image.
            */

            candidatePhoto.appendChild(
                image
            );

        };


        if (instant) {

            loadImage();

        } else {

            setTimeout(
                loadImage,
                160
            );

        }

    }


    /* =========================================
       MOVE TO CANDIDATE
    ========================================== */

    function goToCandidate(index) {

        if (
            isAnimating ||
            index === activeIndex ||
            index < 0 ||
            index >= candidates.length
        ) {
            return;
        }

        isAnimating =
            true;

        /*
            Add transition class if your
            CSS contains it.
        */

        if (candidatePhoto) {

            candidatePhoto.classList.add(
                "photo-changing"
            );

        }

        /*
            Small delay makes the transition
            feel intentional.
        */

        setTimeout(
            () => {

                updateCandidate(
                    index
                );

                /*
                    Keep wheel centered on
                    selected candidate.
                */

                positionWheel();

            },
            180
        );

        setTimeout(
            () => {

                isAnimating =
                    false;

            },
            wheelAnimationDuration
        );

    }


    /* =========================================
       NEXT / PREVIOUS
    ========================================== */

    function changeCandidate(
        direction
    ) {

        if (
            isAnimating ||
            !candidates.length
        ) {
            return;
        }

        let nextIndex =
            activeIndex + direction;

        /*
            LOOP THE WHEEL.

            Last -> First
            First -> Last
        */

        if (
            nextIndex >=
            candidates.length
        ) {

            nextIndex = 0;

        }

        if (
            nextIndex < 0
        ) {

            nextIndex =
                candidates.length - 1;

        }

        goToCandidate(
            nextIndex
        );

    }


    /* =========================================
       MOUSE WHEEL
    ========================================== */

    window.addEventListener(
        "wheel",
        (event) => {

            if (!candidates.length) {
                return;
            }

            /*
                Only react when the user's mouse
                is actually over the voting wheel.
            */

            if (
                wheelArea &&
                !wheelArea.contains(event.target)
            ) {
                return;
            }

            /*
                Ignore tiny trackpad movement.
            */

            if (
                Math.abs(event.deltaY) <
                wheelSensitivity
            ) {
                return;
            }

            /*
                Prevent the entire page from
                scrolling while using the wheel.
            */

            event.preventDefault();

            const now =
                Date.now();

            /*
                Prevent ultra-fast trackpad
                scrolling from skipping candidates.
            */

            if (
                now - lastWheelTime <
                wheelAnimationDuration
            ) {
                return;
            }

            lastWheelTime =
                now;

            if (event.deltaY > 0) {

                /*
                    Scroll DOWN
                    = NEXT CANDIDATE
                */

                changeCandidate(1);

            } else {

                /*
                    Scroll UP
                    = PREVIOUS CANDIDATE
                */

                changeCandidate(-1);

            }

        },
        {
            passive: false
        }
    );


    /* =========================================
       TOUCH / MOBILE SWIPE
    ========================================== */

    if (wheelArea) {

        wheelArea.addEventListener(
            "touchstart",
            (event) => {

                if (
                    !event.touches.length
                ) {
                    return;
                }

                touchStartY =
                    event.touches[0].clientY;

            },
            {
                passive: true
            }
        );


        wheelArea.addEventListener(
            "touchend",
            (event) => {

                if (
                    !event.changedTouches.length
                ) {
                    return;
                }

                const touchEndY =
                    event.changedTouches[0].clientY;

                const difference =
                    touchStartY -
                    touchEndY;

                if (
                    Math.abs(difference) <
                    45
                ) {
                    return;
                }

                if (difference > 0) {

                    changeCandidate(1);

                } else {

                    changeCandidate(-1);

                }

            },
            {
                passive: true
            }
        );

    }


    /* =========================================
       KEYBOARD CONTROLS
    ========================================== */

    window.addEventListener(
        "keydown",
        (event) => {

            /*
                Don't interfere with typing.
            */

            const tag =
                document.activeElement?.tagName;

            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "BUTTON"
            ) {
                return;
            }

            if (
                event.key ===
                "ArrowDown"
            ) {

                event.preventDefault();

                changeCandidate(1);

            }

            if (
                event.key ===
                "ArrowUp"
            ) {

                event.preventDefault();

                changeCandidate(-1);

            }

        }
    );


    /* =========================================
       MODAL
    ========================================== */

    function updateModal(
        candidate
    ) {

        if (modalCandidateName) {

            modalCandidateName.textContent =
                candidate.name;

        }

        if (modalCandidatePosition) {

            modalCandidatePosition.textContent =
                candidate.position;

        }

    }


    function closeModal() {

        if (!voteModal) {
            return;
        }

        voteModal.classList.remove(
            "active"
        );

    }


    if (modalClose) {

        modalClose.addEventListener(
            "click",
            closeModal
        );

    }


    if (modalCancel) {

        modalCancel.addEventListener(
            "click",
            closeModal
        );

    }


    if (voteModal) {

        voteModal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    voteModal
                ) {

                    closeModal();

                }

            }
        );

    }


    /* =========================================
       VOTE BUTTON
    ========================================== */

    if (voteButton) {

        voteButton.addEventListener(
            "click",
            () => {

                if (!candidates.length) {
                    return;
                }

                const candidate =
                    candidates[activeIndex];

                updateModal(
                    candidate
                );

                if (voteModal) {

                    voteModal.classList.add(
                        "active"
                    );

                }

            }
        );

    }


    /* =========================================
       UPDATE VOTE BUTTON
    ========================================== */

    function updateVoteButton() {

        /*
            Keep the existing button state.
            The backend remains responsible
            for validating whether the student
            can vote.
        */

        if (!voteButton) {
            return;
        }

        if (
            voteButton.classList.contains(
                "vote-submitted"
            )
        ) {
            return;
        }

        voteButton.innerHTML = `
            <span>
                VOTE FOR CANDIDATE
            </span>

            <span class="vote-arrow">
                →
            </span>
        `;

    }


    /* =========================================
       CONFIRM VOTE
    ========================================== */

    if (modalConfirm) {

        modalConfirm.addEventListener(
            "click",
            async () => {

                if (!candidates.length) {
                    return;
                }

                const candidate =
                    candidates[activeIndex];

                modalConfirm.disabled =
                    true;

                modalConfirm.textContent =
                    "SUBMITTING...";

                try {

                    const response =
                        await fetch(
                            "/api/vote",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        candidate_id:
                                            candidate.id
                                    })
                            }
                        );

                    const data =
                        await response.json();

                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        throw new Error(
                            data.message ||
                            "Unable to submit vote."
                        );

                    }

                    closeModal();

                    voteButton.innerHTML = `
                        <span>
                            VOTE SUBMITTED
                        </span>

                        <span>
                            ✓
                        </span>
                    `;

                    voteButton.disabled =
                        true;

                    voteButton.classList.add(
                        "vote-submitted"
                    );

                    alert(
                        "Your vote has been submitted successfully."
                    );

                } catch (error) {

                    console.error(
                        "Vote error:",
                        error
                    );

                    alert(
                        error.message ||
                        "Something went wrong while submitting your vote."
                    );

                } finally {

                    modalConfirm.disabled =
                        false;

                    modalConfirm.textContent =
                        "CONFIRM VOTE";

                }

            }
        );

    }


    /* =========================================
       HTML ESCAPE
    ========================================== */

    function escapeHTML(
        value
    ) {

        const div =
            document.createElement("div");

        div.textContent =
            value ?? "";

        return div.innerHTML;

    }


    /* =========================================
       RESIZE
    ========================================== */

    window.addEventListener(
        "resize",
        () => {

            positionWheel();

        }
    );


    /* =========================================
       START APPLICATION
    ========================================== */

    loadCandidates();

});