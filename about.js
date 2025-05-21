const aboutSound = document.getElementById("about-sound");
aboutSound.volume = 0.5;
const hoverSound = document.getElementById("hover-menu");
const clickSound = document.getElementById("click-sound");
const goBackBtn = document.getElementById("home-btn");
const playBtn = document.getElementById("play-link");
const playBtnDiv = document.getElementById("play-button");

function playHoverSound() {
    console.log('Hover detected');
    if (hoverSound) {
        hoverSound.currentTime = 0;
        hoverSound.play();
    }
}

if (goBackBtn) {
    goBackBtn.addEventListener("mouseenter", playHoverSound);

 
    goBackBtn.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent immediate navigation
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play();
        }

        setTimeout(() => {
            window.location.href = "menu.html";
        }, 800); 
    });
}

if (playBtn) {
    playBtn.addEventListener("mouseenter", playHoverSound);
}

if (playBtnDiv) {
    playBtnDiv.addEventListener("mouseenter", playHoverSound);
}
