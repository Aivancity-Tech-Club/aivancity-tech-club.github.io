/* THE SHOWCASE DATA: apps and websites built by aivancity students, shown on /showcase.
   To add an app, copy one block below and change it. Keep the French text too.

   id           short unique name, lowercase with dashes (also used in the page address: /showcase#id)
   name         the app's name, as the students wrote it
   tagline      one short line (≈ 60 characters); tagline_fr in French
   description  two or three sentences: what it does and for whom; description_fr in French
   category     one of the ids in SHOWCASE_CATEGORIES below
   link         where to try it (https://…); leave "" if there is only code
   repo         code repository (https://…), optional
   cover        screenshot in assets/showcase/ (960×600 .webp), optional
   logo         square icon in assets/showcase/ (128×128 .webp), optional: without one, the first letter is shown
   color        background colour for the letter when there is no logo
   by           who made it. Leave "" until the team agrees to be named (the repository is public).
   added        the date it was added to the showcase (YYYY-MM-DD): the newest apps are shown first
   season       when it was made, e.g. "Autumn 2026"; season_fr in French
   featured     true to always show it on the home page (otherwise apps with a screenshot take turns, one set of 3 per day)
   note         optional short warning shown on the card (e.g. "Wakes up in about 30 seconds"); note_fr in French
*/
const SHOWCASE_CATEGORIES = [
  { id: 'health', title: 'Health & fitness', title_fr: 'Santé & sport' },
  { id: 'student-life', title: 'Student life', title_fr: 'Vie étudiante' },
  { id: 'learning', title: 'Learning', title_fr: 'Apprendre' },
  { id: 'money', title: 'Money', title_fr: 'Argent' },
  { id: 'careers', title: 'Careers', title_fr: 'Carrière' },
  { id: 'community', title: 'Community', title_fr: 'Communauté' },
  { id: 'style', title: 'Style & beauty', title_fr: 'Style & beauté' },
];

const SHOWCASE_APPS = [
  {
    id: 'france-welcome', name: 'France Welcome', category: 'student-life', added: '2026-11-24',
    tagline: 'The paperwork guide for foreign students arriving in France',
    tagline_fr: 'Le guide des démarches pour les étudiants étrangers qui arrivent en France',
    description: 'An interactive checklist for visas, bank, housing and CAF, a monthly budget calculator, and the 2026 rule changes explained in plain English. Pick your profile and it shows only the steps that apply to you.',
    description_fr: 'Une checklist interactive pour le visa, la banque, le logement et la CAF, un calculateur de budget mensuel et les changements de règles de 2026 expliqués simplement. Choisissez votre profil : seules les étapes qui vous concernent s\'affichent.',
    link: 'https://france-welcome-aivancity.netlify.app/', repo: '',
    cover: 'france-welcome.webp', logo: '', color: '#1f5fd1', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'relay', name: 'Relay', category: 'learning', added: '2026-11-24',
    tagline: 'Stuck on a course? Get help from a student one year above',
    tagline_fr: 'Bloqué sur un cours ? Faites-vous aider par un étudiant de l\'année au-dessus',
    description: 'A clickable prototype that matches students who struggle with a course with someone from the year above who did well in it, for coursework but also for internships, alternance and choosing courses.',
    description_fr: 'Un prototype cliquable qui met en relation les étudiants en difficulté sur un cours avec quelqu\'un de l\'année au-dessus qui l\'a réussi : pour les cours, mais aussi les stages, l\'alternance et le choix des options.',
    link: 'https://aminaaddd.github.io/relay-demo/index.html', repo: '',
    cover: 'relay.webp', logo: 'relay-logo.webp', color: '#16181d', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'gradeeting', name: 'Gradeeting', category: 'community', added: '2026-11-24',
    tagline: 'Meet aivancity students and teachers before the first conversation',
    tagline_fr: 'Découvrez les étudiants et les profs d\'aivancity avant la première conversation',
    description: 'Volunteers share a photo, their class and a few words; visitors leave moderated, anonymous comments. It also has two small games to get to know people: Guess Who and Swipe & Meet.',
    description_fr: 'Les volontaires partagent une photo, leur classe et quelques mots ; les visiteurs laissent des commentaires anonymes et modérés. Deux petits jeux pour faire connaissance : Qui est-ce ? et Swipe & Meet.',
    link: 'https://gradeeting.netlify.app/', repo: 'https://github.com/Keogo811/gradeeting',
    cover: 'gradeeting.webp', logo: '', color: '#e0623a', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'curl-check', name: 'Curl Check', category: 'style', added: '2026-11-24',
    tagline: 'A one-minute hair quiz for wavy, curly and coily hair',
    tagline_fr: 'Un quiz capillaire d\'une minute pour cheveux ondulés, bouclés et crépus',
    description: 'Answer a few questions and get a personal routine, product reviews by hair type, a community board and a wash-day tracker.',
    description_fr: 'Répondez à quelques questions et obtenez une routine personnalisée, des avis produits par type de cheveux, un espace communauté et un suivi des jours de lavage.',
    link: 'https://curlcheck-project.streamlit.app/', repo: '',
    cover: '', logo: '', color: '#8a4b2a', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
    note: 'The app may need half a minute to wake up.', note_fr: 'L\'application peut mettre une trentaine de secondes à se réveiller.',
  },
  {
    id: 'ascendlab', name: 'AscendLab', category: 'health', added: '2026-11-24',
    tagline: 'Your training and nutrition plan, built around you',
    tagline_fr: 'Votre programme d\'entraînement et de nutrition, construit autour de vous',
    description: 'An AI-powered companion for beginners and athletes in any sport: a weekly programme based on your level, goals and free time, with a calorie target and advice on protein, steps and recovery.',
    description_fr: 'Un compagnon propulsé par l\'IA pour débutants et sportifs confirmés : un programme hebdomadaire selon votre niveau, vos objectifs et votre temps libre, avec un objectif calorique et des conseils sur les protéines, les pas et la récupération.',
    link: 'https://ascendlab-def55.web.app/', repo: '',
    cover: 'ascendlab.webp', logo: 'ascendlab-logo.webp', color: '#0c0d12', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'take-care', name: 'Take Care', category: 'health', added: '2026-11-24',
    tagline: 'Free 5 to 30 minute workouts for your break',
    tagline_fr: 'Des séances de sport gratuites de 5 à 30 minutes pour votre pause',
    description: 'The best free workout videos, sorted by length and by how much you will sweat, with one theme per weekday and a WhatsApp channel to keep each other going. Made for students and office workers short on time.',
    description_fr: 'Les meilleures vidéos de sport gratuites, triées par durée et par niveau de sueur, avec un thème par jour et une chaîne WhatsApp pour se motiver ensemble. Pour les étudiants et les salariés qui manquent de temps.',
    link: 'https://takecare-pause.netlify.app/', repo: '',
    cover: 'take-care.webp', logo: 'take-care-logo.webp', color: '#17705f', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'abroadly', name: 'Abroadly', category: 'money', added: '2026-11-24',
    tagline: 'Money clarity for students living abroad',
    tagline_fr: 'Y voir clair dans son argent quand on étudie à l\'étranger',
    description: 'Track your spending, set a monthly budget and see everything in your own currency, with exchange rates explained. There is a demo with sample data if you just want to look around.',
    description_fr: 'Suivez vos dépenses, fixez un budget mensuel et voyez tout dans votre devise, taux de change expliqués. Une démo avec des données d\'exemple permet de faire le tour sans compte.',
    link: 'https://bespoke-sunshine-2fe34a.netlify.app/', repo: '',
    cover: 'abroadly.webp', logo: 'abroadly-logo.webp', color: '#183a2c', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'microtime', name: 'MicroTime', category: 'student-life', added: '2026-11-24',
    tagline: 'Make the most of the short gaps between classes',
    tagline_fr: 'Profitez des petits trous entre les cours',
    description: 'A 30-minute gap or two hours between classes often turns into scrolling. MicroTime suggests small things that fit the time you have, and keeps a friendly class leaderboard.',
    description_fr: 'Une demi-heure ou deux heures entre deux cours finissent souvent sur le téléphone. MicroTime propose de petites choses à faire dans le temps dont vous disposez, avec un classement amical par classe.',
    link: 'https://aniikkvora.github.io/microtime/', repo: '',
    cover: 'microtime.webp', logo: 'microtime-logo.webp', color: '#2f9e64', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'helper', name: 'Helper', category: 'careers', added: '2026-11-25',
    tagline: 'Your job and internship search, all in one place',
    tagline_fr: 'Votre recherche de stage ou d\'emploi, au même endroit',
    description: 'Track your applications, prepare interviews, keep your recruiters\' details, find companies and offers, and write CVs and cover letters.',
    description_fr: 'Suivez vos candidatures, préparez vos entretiens, gardez les coordonnées des recruteurs, trouvez des entreprises et des offres, et rédigez CV et lettres de motivation.',
    link: 'https://helper-job-search-center.web.app/', repo: 'https://github.com/Hii987/Helper',
    cover: '', logo: '', color: '#1b6b3a', by: 'Nathan Celerier, PGE3 AI & Data Science', season: 'Autumn 2026', season_fr: 'Automne 2026',
    note: 'Still in development: feedback welcome.', note_fr: 'Encore en développement : vos retours sont les bienvenus.',
  },
  {
    id: 'no-return', name: 'No Return', category: 'style', added: '2026-11-24',
    tagline: 'Try clothes on before you buy, and wear more of what you own',
    tagline_fr: 'Essayez avant d\'acheter, et portez davantage ce que vous avez déjà',
    description: 'A virtual try-on to see clothes on you before buying, a closet in your pocket, and an outfit every morning based on the weather and what you have not worn in a while. Available in five languages.',
    description_fr: 'Un essayage virtuel pour voir un vêtement porté avant de l\'acheter, votre dressing dans la poche et une tenue chaque matin selon la météo et ce que vous n\'avez pas porté depuis longtemps. Disponible en cinq langues.',
    link: 'https://noreturn.onrender.com/app/', repo: '',
    cover: 'no-return.webp', logo: 'no-return-logo.webp', color: '#141414', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
    note: 'May take half a minute to open the first time.', note_fr: 'Peut mettre une trentaine de secondes à s\'ouvrir la première fois.',
  },
  {
    id: 'phenixfit', name: 'PhenixFit', category: 'health', added: '2026-11-24',
    tagline: 'How much to eat and how to train, from your own numbers',
    tagline_fr: 'Combien manger et comment s\'entraîner, à partir de vos chiffres',
    description: 'Enter your weight, height, age and goal: PhenixFit works out your daily calories and protein, sets up 3 to 6 workouts a week and suggests a matching meal plan. Free, no account, your data stays on your phone.',
    description_fr: 'Indiquez votre poids, votre taille, votre âge et votre objectif : PhenixFit calcule vos calories et protéines quotidiennes, prépare 3 à 6 séances par semaine et propose des repas adaptés. Gratuit, sans compte, vos données restent sur votre téléphone.',
    link: 'https://phenix-fit.vercel.app/', repo: '',
    cover: 'phenixfit.webp', logo: 'phenixfit-logo.webp', color: '#c2410c', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
  {
    id: 'tech-club', name: 'aivancity Tech Club', category: 'community', added: '2026-11-24',
    tagline: 'The club\'s website and member platform',
    tagline_fr: 'Le site et la plateforme des membres du club',
    description: 'The weekly schedule, sign-up for sessions, and a game where every member climbs a mountain as a ninja by attending, helping others and shipping projects. Built to keep more students active in the club.',
    description_fr: 'Le programme de la semaine, l\'inscription aux séances et un jeu où chaque membre gravit une montagne en ninja en venant, en aidant les autres et en livrant des projets. Conçu pour que plus d\'étudiants restent actifs dans le club.',
    link: 'https://aivancity-tech-club.github.io/', repo: 'https://github.com/Aivancity-Tech-Club/aivancity-tech-club.github.io',
    cover: 'tech-club.webp', logo: '../tech-club-logo.svg', color: '#2b3767', by: '', season: 'Autumn 2026', season_fr: 'Automne 2026',
  },
];
