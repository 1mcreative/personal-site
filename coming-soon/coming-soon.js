const words = document.querySelectorAll("[data-word]");

words.forEach((word) => {
  const text = word.textContent.trim();
  word.textContent = "";
  [...text].forEach((letter, index) => {
    const char = document.createElement("span");
    char.className = "char";
    char.style.setProperty("--i", String(index));
    char.textContent = letter;
    word.append(char);
  });
});

const stage = document.querySelector("[data-stage]");
const orbs = document.querySelectorAll("[data-parallax]");

if (stage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  stage.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    orbs.forEach((orb) => {
      const depth = Number(orb.dataset.parallax);
      orb.style.translate = `${x * depth}px ${y * depth}px`;
    });
  });
}
