// Content source of truth. Edit this file, then run `npm run build`.
//
// Originally generated from the CV PDF by scripts/cv_to_data.py, since
// hand-corrected — regenerating from a PDF will overwrite the fixes below
// (chemical subscripts, superscript exponents, degree abbreviations).
const portfolioData = {
  // Shown in the footer. A literal string rather than a build-time stamp:
  // prerender --check compares committed output byte for byte, so a generated
  // date would fail CI the moment the month rolled over. Bump it by hand.
  lastUpdated: "August 2026",
  /*
   * Drives the JSON-LD that scripts/prerender.js writes into index.html — one
   * block holding a Person plus a ScholarlyArticle per publication. It has to
   * be a single block: check-integrity.js has one sha256 slot in the CSP to
   * update, so two blocks would overwrite each other's hash.
   */
  seo: {
    url: "https://mukeshkhanore.github.io/",
    jobTitle: "Computational Physicist",
    description:
      "Computational physicist specializing in mathematical and numerical modeling, developing machine learning approaches to optimize large-scale atomic simulations of materials such as perovskites.",
    orcid: "https://orcid.org/0009-0008-1487-3562",
    affiliation: {
      name: "Institute of Physics, Czech Academy of Sciences",
      url: "https://www.fzu.cz/en",
    },
    alumniOf: ["Charles University, Prague", "University of Pune"],
    knowsAbout: [
      "Computational Physics",
      "Machine Learning",
      "Atomic Simulations",
      "Perovskites",
      "Density Functional Theory",
      "Numerical Modeling",
      "Data Science",
    ],
  },
  research: {
    intro:
      "My work sits between electronic-structure theory and machine learning: training interatomic potentials on ab-initio data so that simulations which would take weeks of DFT run in hours, then using them to map the energy landscapes of ferroelectric oxides.",
    focus: [
      {
        title: "Machine-Learned Interatomic Potentials",
        description:
          "Fine-tuning GRACE and ACE-type potentials on curated VASP MLFF datasets, then validating them against DFT energies, forces and phonon spectra. The goal is ab-initio accuracy at a cost that scales to systems classical DFT cannot reach.",
        tags: ["GRACE", "ACE", "VASP MLFF", "Active learning"],
      },
      {
        title: "High-Performance Materials Simulation",
        description:
          "Running and scaling these calculations on national and European supercomputers: Slurm job pipelines, containerised toolchains, and GPU workflows for both training and production molecular dynamics.",
        tags: ["Slurm", "Apptainer", "GPU", "LAMMPS"],
      },
    ],
    methods: [
      "Python",
      "LAMMPS",
      "VASP",
      "ASE",
      "Ovito",
      "Pymatgen",
      "Scikit-learn",
      "Pandas",
      "NumPy",
    ],
  },
  profile: {
    name: "Mukesh Khanore",
    tagline: "Computational Physicist & PhD Researcher",
    titles: "Computational physicist · PhD researcher · Data scientist",
    statement:
      "Machine learning for large-scale atomic simulation of perovskites.",
    // Two sentences. This is the hero; the full version lives in `bio`.
    summary:
      "I build machine-learning interatomic potentials that make large-scale atomistic simulations of ferroelectric perovskites run orders of magnitude faster while keeping ab-initio accuracy. My work spans model training, scientific software development and high-performance computing on national and European supercomputers.",
    // Short scannable paragraphs rather than one dense block.
    bio: [
      "I am a computational physicist finishing a PhD at Charles University and the Institute of Physics of the Czech Academy of Sciences. My research trains machine-learned interatomic potentials on ab-initio data so that simulations which would take weeks of DFT can run in hours without giving up quantum-level accuracy.",
      "Before returning to academia I spent two years in industry as a data scientist and analyst — leading small teams, building forecasting models for electricity demand and renewable generation, and turning messy operational data into something decision-makers could act on.",
      "Day to day I work in Python and FORTRAN on Slurm clusters, with a background in numerical methods, sparse linear algebra and GPU workflows. I have published on strongly correlated electrons, ultracold atoms in optical lattices, and the energy landscapes of perovskites.",
    ],
    avatar: "Assets/profile_avatar.jpg",
    email: "mukeshkhanore@gmail.com",
    social: [
      {
        name: "Email",
        icon: "fas fa-mail",
        url: "mailto:mukeshkhanore@gmail.com",
      },
      {
        name: "GitHub",
        icon: "fab fa-github",
        url: "https://github.com/mukeshkhanore",
      },
      {
        name: "LinkedIn",
        icon: "fab fa-linkedin",
        url: "https://www.linkedin.com/in/mukesh-prakash-k-32739419/",
      },
      {
        name: "Google Scholar",
        icon: "fas fa-graduation-cap",
        url: "https://scholar.google.com/citations?user=yfNstRMAAAAJ&hl=en",
      },
      {
        name: "ResearchGate",
        icon: "fab fa-researchgate",
        url: "https://www.researchgate.net/profile/Mukeshkumar-Khanore",
      },
      {
        name: "ORCID",
        icon: "fab fa-orcid",
        url: "https://orcid.org/0009-0008-1487-3562",
      },
    ],
  },
  education: [
    {
      degree: "PhD in Physics",
      institution: "Charles University, Prague",
      meta: "Expected 2026/2027",
      description: "Faculty of Mathematics and Physics.",
    },
    {
      degree: "M.Sc. in Physics",
      institution: "University of Pune",
      meta: "August 2013",
      description: "Department of Physics.",
    },
    {
      degree: "B.Sc. in Physics",
      institution: "S. P. College, University of Pune",
      meta: "",
      description: "",
    },
  ],
  // Reverse-chronological by start date. Keep it that way — the timeline rail
  // renders the list in array order and does not sort.
  experience: [
    {
      role: "PhD Researcher",
      company: "Institute of Physics, Czech Academy of Sciences",
      period: "Oct 2022 - Present",
      details: [
        "Developing a machine-learning approach to accelerate large-scale atomistic simulations of ferroelectric perovskites while retaining ab-initio accuracy.",
        "Fine-tune GRACE machine-learned interatomic potentials on curated VASP MLFF datasets; validate against DFT energies, forces, phonons and phase diagrams.",
        "Presented results at the 15th European Meeting on Ferroelectricity (Katowice, 2025), the XXVI Czech–Polish seminar (Milovy, 2026) and the E-MRS fall meeting (Warsaw, 2026).",
      ],
    },
    {
      role: "Senior Data Analyst",
      company: "Sourcelink Software, Inc. (dba Dosii)",
      period: "Feb 2022 - Aug 2022",
      details: [
        "Led the data analytics team; owned data extraction, cleaning and validation pipelines.",
        "Designed and applied predictive algorithms and presented insights to stakeholders and management.",
      ],
    },
    {
      role: "Deputy Manager (Data Science)",
      company: "Regent Climate Connect Knowledge Solutions Pvt. Ltd.",
      period: "Dec 2020 - Oct 2021",
      details: [
        "Managed the weather-forecasting team; responsible for error analysis and integration of data from multiple forecast providers.",
        "Contributed to machine-learning weather models for electricity demand and renewable (solar and wind) power forecasting.",
      ],
    },
    {
      role: "Consultant",
      company: "Skymet Weather Services Pvt. Ltd.",
      period: "Oct 2019 - May 2020",
      details: [
        "Developed a parameter-based mathematical model in FORTRAN for weather-optimal ship routing based on forecast data.",
      ],
    },
    {
      role: "Project Assistant",
      company: "Department of Physics, S. P. Pune University",
      period: "Aug 2013 - Aug 2019",
      details: [
        "Studied ground-state properties of ultracold atoms in rotating optical lattices via the extended Bose–Hubbard model, using both analytical and numerical methods.",
        "Implemented large sparse-matrix exact diagonalization with the Davidson algorithm for Hilbert spaces of dimension 10⁷.",
      ],
    },
  ],
  projects: [
    {
      name: "PDF to BibTeX",
      url: "https://github.com/mukeshkhanore/pdf-to-bibtex",
      meta: "Automation Tool",
      description:
        "Scans a folder of paper PDFs, extracts the DOI embedded in each one and resolves it into a formatted BibTeX entry. Built to keep a growing LaTeX bibliography in sync with a reference library without retyping citations by hand.",
      tags: ["Python", "LaTeX", "BibTeX", "DOI"],
    },
    {
      name: "Descriptors Visualization",
      url: "https://github.com/mukeshkhanore/descriptors_visualization",
      meta: "Materials Science",
      description:
        "Desktop GUI for generating structural descriptors from atomic configurations and plotting them interactively. Used to sanity-check the feature representations that go into machine-learned interatomic potentials before training.",
      tags: ["Python", "GUI", "Descriptors", "Materials Science"],
    },
    {
      name: "1D Hubbard Model",
      url: "https://github.com/mukeshkhanore/1d_hubbard_model",
      meta: "Physics Simulation",
      description:
        "Numerical solver for the one-dimensional Hubbard model of correlated electrons, computing ground-state properties across the interaction strength range. A compact reference implementation of the exact-diagonalization approach used in my published work.",
      tags: ["Python", "Exact Diagonalization", "Condensed Matter"],
    },
    {
      name: "Qiskit Testing",
      url: "https://github.com/mukeshkhanore/Qiskit_testing",
      meta: "Quantum Computing",
      description:
        "Working notebooks exploring IBM's Qiskit framework — circuit construction, measurement and simulator backends — as a way into quantum algorithms for many-body problems.",
      tags: ["Qiskit", "Python", "Quantum Circuits"],
    },
    {
      name: "Percolation Project",
      url: "https://github.com/mukeshkhanore/percolation_project",
      meta: "Statistical Mechanics",
      description:
        "Monte Carlo study of percolation on lattices: locating the critical threshold, tracking cluster growth and visualising how connectivity emerges as site occupation increases.",
      tags: ["Python", "Monte Carlo", "Statistical Mechanics"],
    },
    {
      name: "Map Plotting Python",
      url: "https://github.com/mukeshkhanore/map_plotting_python",
      meta: "Data Visualisation",
      description:
        "Plotting utilities for geospatial forecast data, producing publication-quality maps of gridded fields. Written during my weather-forecasting work, where every model run needed a readable spatial view.",
      tags: ["Python", "Matplotlib", "Geospatial"],
    },
    {
      name: "Gridded Data",
      url: "https://github.com/mukeshkhanore/grided_data",
      meta: "Data Processing",
      description:
        "Routines for reading, regridding and subsetting grid-based scientific datasets, so that outputs from different forecast providers on different grids can be compared on common ground.",
      tags: ["Python", "NumPy", "Data Pipelines"],
    },
    {
      name: "Any Base Number Representation",
      url: "https://github.com/mukeshkhanore/any_base_number_representation",
      meta: "Algorithms",
      description:
        "Small library for converting numbers between arbitrary bases in both directions, including fractional parts — the kind of primitive that turns up repeatedly in encoding and indexing problems.",
      tags: ["Python", "Algorithms", "Number Theory"],
    },
    {
      name: "Remote Access",
      url: "https://github.com/mukeshkhanore/remote_access",
      meta: "HPC Utilities",
      description:
        "Helper scripts for working on remote compute clusters: opening connections, moving job files and retrieving results, cutting the boilerplate out of a daily HPC workflow.",
      tags: ["Shell", "SSH", "HPC"],
    },
  ],
  // `journal`, `volume`, `pages`, `year` and `doi` drive both the citation line
  // and the ScholarlyArticle JSON-LD that scripts/prerender.js emits.
  publications: [
    {
      title:
        "Quantum dynamics in symmetry-breaking states of correlated electrons: Antiferromagnetic phase",
      journal: "Physica Scripta",
      volume: "101",
      pages: "155904",
      year: "2026",
      doi: "10.1088/1402-4896/ae59c0",
      meta: "Phys. Scr. 101, 155904 (2026)",
      authors: "Václav Janiš, Mukesh Khanore, and Antonín Klíč",
      url: "https://iopscience.iop.org/article/10.1088/1402-4896/ae59c0/meta",
    },
    {
      title:
        "Transition metals: Matching microscopic quantum dynamics with macroscopic magnetic order",
      journal: "AIP Advances",
      volume: "15",
      pages: "3",
      year: "2025",
      doi: "10.1063/9.0000859",
      meta: "AIP Advances 15, 3 (2025)",
      authors: "Václav Janiš and Mukesh Khanore",
      url: "https://doi.org/10.1063/9.0000859",
    },
    {
      title:
        "The quantum vortex states in extended Bose–Hubbard model: effects of lattice geometries, inter-particle interactions and spatial inhomogeneity",
      journal: "The European Physical Journal D",
      volume: "76",
      pages: "16",
      year: "2022",
      doi: "10.1140/epjd/s10053-022-00350-5",
      meta: "Eur. Phys. J. D 76, 16 (2022)",
      authors: "Mukesh Khanore and Bishwajyoti Dey",
      url: "https://doi.org/10.1140/epjd/s10053-022-00350-5",
      description:
        "Investigated effects of lattice geometries, inter-particle interactions and spatial inhomogeneity on quantum vortex states.",
    },
    {
      title:
        "Coexistence of Mott and superfluid domain of bosons confined in optical lattice",
      journal: "AIP Conference Proceedings",
      volume: "1665",
      pages: "030033",
      year: "2015",
      doi: "10.1063/1.4917674",
      meta: "AIP Conf. Proc. 1665, 030033 (2015)",
      authors: "Mukesh Khanore and Bishwajyoti Dey",
      url: "https://doi.org/10.1063/1.4917674",
      description:
        "Analyzed the coexistence of Mott insulator and superfluid phases for bosons confined in an optical lattice.",
    },
    {
      title:
        "Bose–Hubbard model with attractive interactions and inhomogeneous lattice potential",
      journal: "AIP Conference Proceedings",
      volume: "1591",
      pages: "139",
      year: "2014",
      doi: "10.1063/1.4872558",
      meta: "AIP Conf. Proc. 1591, 139 (2014)",
      authors: "Mukesh Khanore and Bishwajyoti Dey",
      url: "https://doi.org/10.1063/1.4872558",
      description:
        "Studied the Bose–Hubbard model with attractive interactions in the presence of an inhomogeneous lattice potential.",
    },
    {
      type: "presentation",
      title:
        "Deep learning frameworks for exploration of energy landscapes of perovskites",
      journal: "ResearchGate",
      year: "2026",
      doi: "10.13140/RG.2.2.20920.92165",
      meta: "Conference Presentation · ResearchGate (2026)",
      authors: "Mukesh Khanore",
      description:
        "Presented at the XXVI Czech–Polish seminar on Structural and Ferroelectric Phase Transitions.",
      url: "https://doi.org/10.13140/RG.2.2.20920.92165",
    },
  ],
  activities: [
    {
      title: "XXVI Czech–Polish seminar",
      meta: "4-8 May 2026",
      description:
        "Presented “Deep Learning Frameworks for Exploration of Energy Landscapes of Perovskites”. Milovy, Czech Republic.",
    },
    {
      title: "The 15th European Meeting on Ferroelectricity",
      meta: "31 Aug-5 Sep 2025",
      description:
        "Poster: “Machine-learning-based Investigation of the Energy Landscape of PbTiO₃, BaTiO₃ and CaTiO₃”. International Congress Centre (ICC), Katowice, Poland.",
    },
    {
      title:
        "Workshop on Classical & Quantum Machine Learning for Condensed Matter Physics",
      meta: "19-21 Jun 2024",
      description: "Online workshop organized by ICTP Trieste, Italy.",
    },
    {
      title: "e-INFRA CZ CONFERENCE",
      meta: "29-30 Apr 2024",
      description: "Hotel Occidental Praha, Prague.",
    },
    {
      title: "Introductory School on Parallel Programming and Architecture",
      meta: "3-14 Oct 2016",
      description: "ICTP, Miramare, Trieste, Italy.",
    },
  ],
  skills: {
    programming: [
      "Python",
      "FORTRAN",
      "C",
      "Julia",
      "SQL",
      "Mathematica",
      "LaTeX",
      "gnuplot",
      "Qiskit",
    ],
    simulation: [
      "VASP (DFT, MLFF)",
      "LAMMPS",
      "ASE",
      "Phonopy",
      "GRACE / ACE-type MLIPs",
      "TensorFlow",
      "scikit-learn",
      "Graph neural networks",
      "Slurm / PBS clusters",
      "Singularity / Apptainer",
      "Git",
      "Linux",
      "Google Cloud",
    ],
    research: [
      "Density functional theory",
      "Machine-learned interatomic potentials",
      "Ferroelectric perovskites",
      "Strongly correlated electrons",
      "Ultracold atoms in optical lattices",
      "Exact diagonalization",
      "Phonon and phase-diagram calculations",
      "Numerical methods and sparse linear algebra",
    ],
  },
  certificates: [
    {
      title: "Fundamentals of Deep Learning",
      issuer: "NVIDIA Deep Learning Institute",
      description:
        "Covered practical deep learning techniques using modern neural network frameworks for real-world AI applications.",
      icon: "fas fa-cpu",
      url: "https://learn.nvidia.com/certificates?id=Ppjc0iNlRJ2yiJdoVhOKgw",
    },
    {
      title: "Fundamentals of Accelerated Computing with Modern CUDA C++",
      issuer: "NVIDIA Deep Learning Institute",
      description:
        "Mastered GPU-accelerated computing using CUDA C++ for high-performance scientific and parallel programming.",
      icon: "fas fa-cpu",
      url: "https://learn.nvidia.com/certificates?id=HuN3OyBJTzuQB_SFkWH_WA",
    },
    {
      title: "Google Data Analytics Certificate",
      issuer: "Google",
      description:
        "Comprehensive training in data analysis, visualization, and reporting using industry-standard tools and workflows.",
      icon: "fab fa-google",
      url: "https://www.credential.net/d3522394-8bfd-455b-8ec6-c5f49424223a#acc.VXtzC23o",
    },
  ],
  teaching: [
    {
      role: "Visiting Faculty",
      institution: "Interdisciplinary School of Science, SPPU",
      description:
        "Taught Quantum Mechanics, Statistical Mechanics and Subatomic Physics to second-year B.Sc. students on the blended course.",
    },
    {
      role: "Visiting Faculty",
      institution:
        "School of Bioengineering Science and Research, MIT-ADT University",
      description:
        "Delivered Basic Mechanical Engineering lectures and practicals to first-year B.Tech and M.Tech students, through December 2020.",
    },
  ],
};
