/* ============================================================
   CLUB SCHEDULE: edit this list to update the website.

   Each entry:
     date        "YYYY-MM-DD"
     key         only when two sessions share a date: a unique name for the second one, e.g. "2026-11-05-evening"
     title       what the session is called
     type        short label shown as a chip (Workshop, Hackathon…)
     track       "tech" | "gdg" | "event" | "break"   (sets the colour)
     description one or two sentences, written for students
     planned     true = the plan may still change (shown as "Planned")
     time / room override the defaults below when needed
     link, linkText  optional button, e.g. a sign-up form (hidden once the session is past)
     format      workshop | hackathon | competition | talk | trip | career | build   (the Type filter)
     level       beginner | intermediate | advanced | all   ("all" shows under every level)
     *_fr        French version of title, type, description, time (shown when the site is in French)
     lang        the language the session is given in: "en" | "fr" | "both"   (shown as a tag, and the Language filter)
     subs        optional support in the other language, e.g. "fr" = French slides/subtitles for an English talk
     recap       after the session, so people who missed it can catch up:
                 { link: "https://… notes or slides", task: "a 15-minute take-home task", task_fr: "…" }
     vote        for a Planned session, members choose what it will be (one vote each, can change it):
                 { question: "What should this session be?", question_fr: "…",
                   options: [{ id: "trivia", title: "Trivia Night", title_fr: "…" }, { id: "algo", title: "Algorithms" }] }

   Past sessions stay on the site automatically, so people can see
   what the club has already done.

   Regular meetings: every Thursday, 1:00–2:00 PM, AIClinic – Room 107.
   ============================================================ */

const CLUB = {
  defaultTime: "1:00 – 2:00 PM",
  defaultRoom: "AIClinic – Room 107",
  season: "Fall 2026",
};

const SESSIONS = [
  // ---------- September: kick-off ----------
  { lang: "en", date: "2026-09-18", format: "hackathon", level: "all", track: "event", type: "Hackathon · In person", title: "RevenueCat Next Gen Hackathon",
    description: "Season opener: an in-person hackathon with RevenueCat Next Gen.", time: "Friday event",
    type_fr: "Hackathon · En présentiel",
    title_fr: "Hackathon RevenueCat Next Gen",
    description_fr: "Lancement de la saison : un hackathon en présentiel avec RevenueCat Next Gen.",
    time_fr: "Événement du vendredi" },
  { lang: "en", date: "2026-09-24", format: "talk", level: "all", track: "event", type: "Presentations", title: "RevenueCat Next Gen: project presentations",
    description: "Teams presented the projects they built during the hackathon.",
    type_fr: "Présentations",
    title_fr: "RevenueCat Next Gen : présentation des projets",
    description_fr: "Les équipes ont présenté les projets construits pendant le hackathon." },

  // ---------- October: find the Thursday rhythm ----------
  { lang: "en", date: "2026-10-01", format: "workshop", level: "beginner", track: "tech", type: "Workshop", title: "Basics of Coding",
    description: "The basics of coding, from writing your first lines to putting a project online.",
    type_fr: "Atelier",
    title_fr: "Les bases du code",
    description_fr: "Les bases de la programmation, des premières lignes à la mise en ligne d'un projet." },
  { lang: "en", date: "2026-10-08", format: "workshop", level: "intermediate", track: "tech", type: "CS50 2026", title: "CS50 2026: Memory",
    description: "A CS50 session on memory: how programs store data, pointers and what really happens in RAM.",
    type_fr: "CS50 2026",
    title_fr: "CS50 2026 : la mémoire",
    description_fr: "Une séance CS50 sur la mémoire : comment les programmes stockent les données, les pointeurs et ce qui se passe vraiment dans la RAM." },
  { lang: "en", date: "2026-10-15", format: "workshop", level: "beginner", track: "tech", type: "Workshop", title: "Version Control with Git and GitHub",
    description: "Why every developer uses version control: commits, branches, merging and pull requests. Bring a laptop, you'll push your first repository to GitHub.",
    type_fr: "Atelier",
    title_fr: "Le versionnage avec Git et GitHub",
    description_fr: "Pourquoi tous les développeurs utilisent le versionnage : commits, branches, fusions et pull requests. Apportez un ordinateur, vous publierez votre premier dépôt sur GitHub." },
  { lang: "en", date: "2026-10-22", format: "workshop", level: "all", track: "event", type: "Workshop + build", title: "Ship-It Night: Halloween Edition",
    description: "A short walkthrough of how to build a simple game, then everyone builds and ships something Halloween-themed.",
    type_fr: "Atelier + build",
    title_fr: "Ship-It Night : spécial Halloween",
    description_fr: "Une courte démo pour créer un petit jeu, puis chacun construit et publie quelque chose sur le thème d'Halloween." },
  { date: "2026-10-29", format: "trip", level: "beginner", track: "event", type: "Field trip · Beginners", title: "Learn to code in Swift at Apple", lang: "fr",
    description: "A beginners' trip to Apple on the Champs-Élysées: an iOS engineer introduces Swift with Swift Playgrounds (in French). Bring an iPad if you have one, and confirm only if you're sure to come.",
    time: "5:00 – 6:00 PM", room: "Apple Office, Champs-Élysées",
    link: "https://forms.cloud.microsoft/e/16AcR8eukd", linkText: "Confirm your attendance",
    type_fr: "Sortie · Débutants",
    title_fr: "Apprendre à coder en Swift chez Apple",
    description_fr: "Sortie débutants chez Apple, sur les Champs-Élysées : un ingénieur iOS initie à Swift avec Swift Playgrounds (en français). Apportez un iPad si vous en avez un, et ne confirmez que si vous êtes sûr(e) de venir.",
    time_fr: "17 h – 18 h", room_fr: "Bureaux d'Apple, Champs-Élysées",
    linkText_fr: "Confirmer ma présence" },

  // ---------- November: going deeper ----------
  { lang: "en", date: "2026-11-05", format: "talk", level: "all", track: "tech", type: "Discussion", title: "Speaker Spotlight", planned: true,
    description: "We watch a talk by a well-known engineer or founder together, then discuss what we can take from it.",
    type_fr: "Discussion",
    title_fr: "Speaker Spotlight",
    description_fr: "On regarde ensemble la conférence d'un ingénieur ou d'une fondatrice reconnu(e), puis on discute de ce qu'on peut en retenir." },
  { lang: "en", date: "2026-11-12", format: "competition", level: "intermediate", track: "event", type: "Coding league", title: "Coding Challenge", planned: true,
    description: "A league-style coding competition. Points count toward your bandana.",
    type_fr: "Ligue de code",
    title_fr: "Coding Challenge",
    description_fr: "Une compétition de code façon ligue. Les points comptent pour votre bandana." },
  { lang: "en", date: "2026-11-19", format: "career", level: "all", track: "tech", type: "Career", title: "Get Hired: make yourself more hireable", planned: true,
    description: "CVs, GitHub profiles, LinkedIn and interview prep: practical steps to stand out for internships and jobs.",
    type_fr: "Carrière",
    title_fr: "Get Hired : devenir plus recrutable",
    description_fr: "CV, profil GitHub, LinkedIn et préparation aux entretiens : des conseils concrets pour se démarquer en stage et en emploi." },
  { lang: "en", date: "2026-11-26", format: "career", level: "all", track: "tech", type: "Business", title: "Starting a Student Enterprise", planned: true,
    description: "What it takes to start a business as a student, from first idea to the paperwork.",
    type_fr: "Entrepreneuriat",
    title_fr: "Créer une entreprise étudiante",
    description_fr: "Ce qu'il faut pour lancer une entreprise en étant étudiant, de la première idée aux démarches." },

  // ---------- December: the big finish ----------
  { lang: "en", date: "2026-12-03", format: "workshop", level: "advanced", track: "tech", type: "Systems design", title: "Systems Design: how would you build it?", planned: true,
    description: "Pick one well-known system, such as a search engine, and design it together on the whiteboard.",
    type_fr: "Conception de systèmes",
    title_fr: "Systems Design : comment le construiriez-vous ?",
    description_fr: "On choisit un système connu, comme un moteur de recherche, et on le conçoit ensemble au tableau." },
  { lang: "en", date: "2026-12-10", format: "build", level: "all", track: "tech", type: "Build day", title: "Demo Polish Day", planned: true,
    description: "Polish your projects and demos before the finale.",
    type_fr: "Journée build",
    title_fr: "Demo Polish Day",
    description_fr: "On peaufine projets et démos avant la finale." },
  { lang: "en", date: "2026-12-17", format: "hackathon", level: "all", track: "event", type: "Hackathon", title: "Season Finale Hackathon", planned: true,
    description: "We close the season with a hackathon.",
    type_fr: "Hackathon",
    title_fr: "Hackathon de fin de saison",
    description_fr: "On clôture la saison avec un hackathon." },
  { date: "2026-12-18", track: "break", title: "Winter break",
    description: "The club is back on Thursday 7 January 2027.",
    title_fr: "Vacances d'hiver",
    description_fr: "Le club reprend le jeudi 7 janvier 2027." },
];

/* Ideas not placed yet (not shown on the site):
   Paper Jam: a recent AI paper (moved from 15 Oct) · Trivia Night (league) · Game Night (league) · topic workshop + open discussion ·
   Programming Time without AI (x2) · Algorithms sessions (x2) */
