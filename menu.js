window.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById("video");
    const intro = document.getElementById("intro-video");
    const mainContent = document.getElementById("main-content");
    const clickSound = document.getElementById("click-sound");
    const menuSound = document.getElementById("menu-sound");
    const hoverSound = document.getElementById("hover-menu");
    const continueOverlay = document.getElementById("continue-overlay");

    function fadeInAudio(audio, targetVolume = 0.3, duration = 3000) {
        let currentVolume = 0;
        const step = targetVolume / (duration / 100);
        audio.volume = 0;
        audio.loop = true;
        audio.play();

        const interval = setInterval(() => {
            currentVolume += step;
            if (currentVolume >= targetVolume) {
                audio.volume = targetVolume;
                clearInterval(interval);
            } else {
                audio.volume = currentVolume;
            }
        }, 100);
    }

   continueOverlay.addEventListener("click", () => {
    if (video.paused) {
        video.play();
        continueOverlay.style.display = "none"; 
        fadeInAudio(menuSound, 0.3);             // <-- Start the intro bg sound here
    }

});


    if (video) {
        video.onended = function () {
            intro.style.transition = "opacity 1s ease";
            intro.style.opacity = 0;

            setTimeout(() => {
                intro.style.display = "none";
                mainContent.style.display = "block";    
            }, 1000);
        };
    }

    const spaceship = document.getElementById("spaceship");
    const playLink = document.getElementById("play-link");

    playLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (clickSound) clickSound.play();

        document.documentElement.style.setProperty("--bg-speed", "60s");

        if (spaceship) {
            spaceship.classList.remove("shake");
            spaceship.classList.add("fly-away");
        }

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);
    });

    document.querySelectorAll(".menu-button").forEach(button => {
        if (button.id !== "play-link") {
            button.addEventListener("click", () => {
                if (clickSound) clickSound.play();
            });
        }

        // Add hover sound on mouse enter
        button.addEventListener("mouseenter", () => {
            if (hoverSound) {
                hoverSound.currentTime = 0; // rewind to start
                hoverSound.play();
            }
        });
    });



});