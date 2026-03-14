const lessons = [
  {
    title: "Fiche 1 — Sources du droit du travail",
    content: "Le droit du travail encadre les relations entre employeurs privés et salariés. Ses sources sont internationales, européennes, nationales et professionnelles."
  },
  {
    title: "Fiche 2 — Conseil de prud’hommes",
    content: "Le conseil de prud’hommes juge les litiges individuels liés au contrat de travail. Il comprend une phase de conciliation puis de jugement."
  },
  {
    title: "Fiche 3 — Inspection du travail",
    content: "L’inspection du travail contrôle l’application du droit du travail, conseille les parties et peut sanctionner certains manquements."
  },
  {
    title: "Fiche 4 — Embauche",
    content: "L’employeur doit respecter la non-discrimination, les formalités d’embauche et les règles de déclaration préalable."
  },
  {
    title: "Fiche 5 — Contrat de travail",
    content: "Le contrat de travail repose sur une prestation, une rémunération et surtout un lien de subordination."
  },
  {
    title: "Fiche 6 — Différents contrats",
    content: "Le CDI est la forme normale. Le CDD est encadré et ne doit pas pourvoir durablement un emploi permanent."
  },
  {
    title: "Fiche 7 — Pouvoir de l’employeur",
    content: "L’employeur dispose d’un pouvoir de direction, de contrôle et disciplinaire, dans le respect des libertés du salarié."
  },
  {
    title: "Fiche 8 — Durée du travail",
    content: "La durée du travail comprend la durée légale, les heures supplémentaires, les aménagements du temps de travail et les forfaits."
  },
  {
    title: "Fiche 9 — Repos et congés",
    content: "Le salarié bénéficie de repos quotidiens, hebdomadaires et de congés payés acquis en fonction du temps de travail."
  },
  {
    title: "Fiche 10 — Formation professionnelle",
    content: "La formation professionnelle favorise l’employabilité des salariés via l’apprentissage, le CPF et d’autres dispositifs."
  },
  {
    title: "Fiche 11 — Santé et sécurité",
    content: "L’employeur a une obligation de prévention pour protéger la santé physique et mentale des salariés."
  },
  {
    title: "Fiche 12 — Salaire et épargne salariale",
    content: "Le salaire doit respecter les minima légaux et conventionnels. Participation, intéressement et épargne salariale peuvent le compléter."
  },
  {
    title: "Fiche 13 — Modification du contrat",
    content: "La modification d’un élément essentiel du contrat nécessite l’accord du salarié, contrairement à un simple changement des conditions de travail."
  },
  {
    title: "Fiche 14 — Suspension du contrat",
    content: "Le contrat peut être suspendu pour maternité, maladie ou accident, avec des protections spécifiques pour le salarié."
  },
  {
    title: "Fiche 15 — Licenciement",
    content: "Le licenciement personnel ou économique doit reposer sur une cause réelle et sérieuse et respecter une procédure précise."
  },
  {
    title: "Fiche 16 — Autres modes de rupture",
    content: "La rupture conventionnelle, la démission, la prise d’acte ou la résiliation judiciaire sont d’autres modes de rupture du contrat."
  },
  {
    title: "Fiche 17 — Conséquences de la rupture",
    content: "La rupture entraîne la remise de documents obligatoires, le solde de tout compte et parfois des indemnités."
  },
  {
    title: "Fiche 18 — Négociation collective",
    content: "Les conventions et accords collectifs organisent les règles applicables dans l’entreprise, la branche ou au niveau national."
  },
  {
    title: "Fiche 19 — Syndicats dans l’entreprise",
    content: "Les syndicats défendent les intérêts professionnels des salariés et participent au dialogue social."
  },
  {
    title: "Fiche 20 — Représentation des salariés",
    content: "Le CSE représente les salariés et exerce des attributions économiques, sociales et en matière de santé au travail."
  },
  {
    title: "Fiche 21 — Statut des représentants",
    content: "Les représentants du personnel bénéficient d’une protection particulière contre le licenciement."
  },
  {
    title: "Fiche 22 — Conflits collectifs",
    content: "La grève est un droit constitutionnel, mais son exercice obéit à des règles et produit des effets juridiques."
  },
  {
    title: "Fiche 23 — Régime général de la Sécurité sociale",
    content: "Le régime général couvre plusieurs branches : maladie, accidents du travail, famille, vieillesse et recouvrement."
  },
  {
    title: "Fiche 24 — Prestations sociales",
    content: "Les prestations sociales compensent certains risques comme la maladie, la maternité, l’invalidité ou la vieillesse."
  },
  {
    title: "Fiche 25 — Activité partielle et chômage",
    content: "L’activité partielle permet de réduire ou suspendre l’activité. L’assurance chômage indemnise certains demandeurs d’emploi."
  },
  {
    title: "Fiche 26 — Aide sociale",
    content: "L’aide sociale apporte un soutien aux personnes en difficulté selon des conditions légales et administratives."
  },
  {
    title: "Fiche 27 — Régimes complémentaires",
    content: "Les régimes complémentaires complètent les protections de base, notamment en santé, prévoyance et retraite."
  },
  {
    title: "Fiche 28 — Contentieux social",
    content: "Le contentieux social concerne les litiges relatifs à la protection sociale et aux décisions des organismes compétents."
  }
];

const flashcards = [
  {
    question: "Quelles sont les 4 grandes sources du droit du travail ?",
    answer: "Les sources internationales, européennes, nationales et professionnelles."
  },
  {
    question: "Quel juge règle les litiges individuels liés au contrat de travail ?",
    answer: "Le conseil de prud’hommes."
  },
  {
    question: "Quel est le contrat de travail de droit commun ?",
    answer: "Le CDI."
  },
  {
    question: "Quel élément est indispensable pour qualifier un contrat de travail ?",
    answer: "Le lien de subordination."
  },
  {
    question: "La modification du contrat de travail nécessite-t-elle l’accord du salarié ?",
    answer: "Oui, pour un élément essentiel du contrat."
  },
  {
    question: "Quel organisme contrôle l’application du droit du travail ?",
    answer: "L’inspection du travail."
  }
];

const quizQuestions = [
  {
    question: "Quelle est la forme normale du contrat de travail ?",
    answers: ["CDD", "CDI", "Intérim"],
    correct: "CDI"
  },
  {
    question: "Quel organe juge les litiges individuels du travail ?",
    answers: ["Tribunal de commerce", "Conseil de prud’hommes", "Conseil constitutionnel"],
    correct: "Conseil de prud’hommes"
  },
  {
    question: "Le CDD peut-il pourvoir durablement un emploi permanent ?",
    answers: ["Oui", "Non", "Seulement en été"],
    correct: "Non"
  },
  {
    question: "Quel représentant du personnel existe dans l’entreprise ?",
    answers: ["Le CSE", "Le Sénat", "Le Préfet"],
    correct: "Le CSE"
  },
  {
    question: "Quel droit est un droit constitutionnel en matière collective ?",
    answers: ["Le droit de grève", "Le droit au bonus", "Le droit à la voiture de fonction"],
    correct: "Le droit de grève"
  }
];

const lessonList = document.getElementById("lesson-list");
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

lessons.forEach((lesson) => {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<h3>${lesson.title}</h3><p>${lesson.content}</p>`;
  lessonList.appendChild(card);
});

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    views.forEach((view) => view.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(btn.dataset.view).classList.add("active");
  });
});

let flashIndex = 0;
let showingAnswer = false;
const flashcard = document.getElementById("flashcard");
const showAnswerBtn = document.getElementById("show-answer");
const nextCardBtn = document.getElementById("next-card");

function renderFlashcard() {
  showingAnswer = false;
  flashcard.textContent = flashcards[flashIndex].question;
}

showAnswerBtn.addEventListener("click", () => {
  if (!showingAnswer) {
    flashcard.textContent = flashcards[flashIndex].answer;
    showingAnswer = true;
  }
});

nextCardBtn.addEventListener("click", () => {
  flashIndex = (flashIndex + 1) % flashcards.length;
  renderFlashcard();
});

renderFlashcard();

let quizIndex = 0;
const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const resultEl = document.getElementById("result");
const nextQuestionBtn = document.getElementById("next-question");

function renderQuestion() {
  const current = quizQuestions[quizIndex];
  questionEl.textContent = current.question;
  answersEl.innerHTML = "";
  resultEl.textContent = "";

  current.answers.forEach((answer) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = answer;
    btn.addEventListener("click", () => {
      if (answer === current.correct) {
        resultEl.textContent = "Bonne réponse ✅";
        resultEl.style.color = "green";
      } else {
        resultEl.textContent = `Mauvaise réponse ❌ — bonne réponse : ${current.correct}`;
        resultEl.style.color = "red";
      }
    });
    answersEl.appendChild(btn);
  });
}

nextQuestionBtn.addEventListener("click", () => {
  quizIndex = (quizIndex + 1) % quizQuestions.length;
  renderQuestion();
});

renderQuestion();
