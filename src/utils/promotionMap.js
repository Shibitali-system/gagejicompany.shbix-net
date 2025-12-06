const classLevelsByEducationLevel = {
  "Pre-primary": [
    "Creche", "Playgroup", "Baby Class", "Nursery 1", "Nursery 2",
    "Middle Class", "Top Class", "Kindergarten 1", "Kindergarten 2",
    "Pre-K", "Reception", "Preparatory", "PP1", "PP2",
    "Petite Section", "Moyenne Section", "Grande Section",
    "KG 1", "KG 2",
    "Kindergarten",
    "Pre-school"
  ],
  "Primary": [
    "Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5", "Standard 6", "Standard 7",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "Primary 7",
    "Cours Préparatoire", "Cours Élémentaire 1", "Cours Élémentaire 2", "Cours Moyen 1", "Cours Moyen 2",
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8",
  ],
  "Lower-Secondary": [
    "Grade 7", "Grade 8", "Grade 9",
    "Junior Secondary 1", "Junior Secondary 2", "Junior Secondary 3",
    "JS1", "JS2", "JS3",
    "Middle School 1", "Middle School 2", "Middle School 3",
    "JHS 1", "JHS 2", "JHS 3",
    "Sixième", "Cinquième", "Quatrième", "Troisième",
    "Form 1", "Form 2", "Form 3",
    "Junior 1", "Junior 2", "Junior 3",
  ],
  "O-Level": [
    "Form 1", "Form 2", "Form 3", "Form 4",
    "Grade 9", "Grade 10", "Grade 11", "Grade 12",
    "SS1", "SS2", "SS3",
    "SHS 1", "SHS 2", "SHS 3",
    "Seconde", "Première",
    "Form 4", "Form 5", "Form 6",
    "Senior 1", "Senior 2", "Senior 3",
  ],
  "A-Level": [
    "Form 5", "Form 6",
    "Grade 13", "Grade 14",
    "S5", "S6",
    "Terminale",
    "Senior 4", "Senior 5", "Senior 6",
  ],
  "Technical-Vocational": [
    "Vocational Level 1", "Vocational Level 2", "Vocational Level 3",
    "Trade Test Grade III", "Trade Test Grade II", "Trade Test Grade I",
    "Basic Technician Certificate",
    "Technician Certificate",
    "Ordinary Diploma",
    "Apprenticeship Program",
    "Craft Certificate",
    "Artisan Certificate",
    "TVET Level 1", "TVET Level 2", "TVET Level 3",
  ],
  "Post-secondary": [
    "Foundation Year", "Diploma Year 1", "Diploma Year 2",
    "Certificate Program", "Technical Year 1", "Technical Year 2",
    "Pre-University", "Bridge Program",
    "Community College Year 1", "Community College Year 2",
    "HND Year 1", "HND Year 2",
  ],
  "Advanced-Programs": [
    "IB Year 1", "IB Year 2",
    "Cambridge AS", "Cambridge A2",
    "AICE Diploma",
    "AP Course 1", "AP Course 2",
    "Baccalaureate Year 1", "Baccalaureate Year 2"
  ],
  "Other": [
    "Adult Education", "Special Needs Program", "Non-formal Education", "Open Schooling"
  ]
};

// Generate promotionMap
const promotionMap = {};

Object.values(classLevelsByEducationLevel).forEach((levels) => {
  levels.forEach((level, index) => {
    if (index < levels.length - 1) {
      promotionMap[level] = levels[index + 1];
    } else {
      promotionMap[level] = "Graduated";
    }
  });
});

export default promotionMap;
