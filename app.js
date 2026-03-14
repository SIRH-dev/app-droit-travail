const lessons = [
  {
    title: "Fiche 1",
    content: "Contenu de test"
  },
  {
    title: "Fiche 2",
    content: "Deuxième fiche"
  }
];

const content = document.getElementById("content");
const courseBtn = document.getElementById("courseBtn");
const flashcardsBtn = document.getElementById("flashcardsBtn");
const quizBtn = document.getElementById("quizBtn");

function setActiveButton(activeBtn) {
  [courseBtn, flashcardsBtn, quizBtn].forEach(btn => btn.classList.remove("active"));
  activeBtn.classList.add("active");
}

function renderHome() {
  content.innerHTML = `
    <div class="card">
      <h2>Palettes de révision</h2>
      <div>
        ${lessons.map((lesson, index) => `
          <button onclick="openLesson(${index})">${lesson.title}</button>
        `).join("")}
      </div>
    </div>
  `;
}

function openLesson(index) {
  const lesson = lessons[index];
  content.innerHTML = `
    <div class="card">
      <button onclick="renderHome()">← Retour</button>
      <h2>${lesson.title}</h2>
      <p>${lesson.content}</p>
    </div>
  `;
}

courseBtn.addEventListener("click", () => {
  setActiveButton(courseBtn);
  renderHome();
});

flashcardsBtn.addEventListener("click", () => {
  setActiveButton(flashcardsBtn);
  content.innerHTML = `<div class="card"><h2>Flashcards</h2><p>Section en test.</p></div>`;
});

quizBtn.addEventListener("click", () => {
  setActiveButton(quizBtn);
  content.innerHTML = `<div class="card"><h2>Quiz</h2><p>Section en test.</p></div>`;
});

renderHome();
