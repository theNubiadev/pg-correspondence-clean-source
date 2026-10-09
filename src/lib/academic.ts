/**
 * Controlled academic options used when logging a letter.
 * Free-text faculty/department values fragment reports.
 */
export const FACULTIES = [
  "Arts",
  "Science",
  "The Social Sciences",
  "Education",
  "Law",
  "Agriculture",
  "Technology",
  "Veterinary Medicine",
  "Pharmacy",
  "Public Health",
  "Clinical Sciences",
  "Basic Medical Sciences",
  "Dentistry",
  "Environmental Design and Management",
  "Renewable Natural Resources",
  "Multidisciplinary Studies",
  "Institute of African Studies",
  "Institute of Education",
  "Other / not stated",
] as const;

export type FacultyName = (typeof FACULTIES)[number];

export const DEPARTMENTS_BY_FACULTY: Record<string, readonly string[]> = {
  Arts: [
    "English",
    "History",
    "Philosophy",
    "Religious Studies",
    "Theatre Arts",
    "Communication and Language Arts",
    "European Studies",
    "Arabic and Islamic Studies",
    "Linguistics and African Languages",
    "Music",
    "Other",
  ],
  Science: [
    "Mathematics",
    "Statistics",
    "Physics",
    "Chemistry",
    "Botany",
    "Zoology",
    "Microbiology",
    "Computer Science",
    "Archaeology and Anthropology",
    "Geology",
    "Other",
  ],
  "The Social Sciences": [
    "Economics",
    "Political Science",
    "Sociology",
    "Psychology",
    "Geography",
    "Urban and Regional Planning",
    "Other",
  ],
  Education: [
    "Teacher Education",
    "Adult Education",
    "Guidance and Counselling",
    "Special Education",
    "Library, Archival and Information Studies",
    "Human Kinetics and Health Education",
    "Other",
  ],
  Law: ["Public and International Law", "Private and Property Law", "Other"],
  Agriculture: [
    "Agronomy",
    "Animal Science",
    "Agricultural Economics",
    "Agricultural Extension and Rural Development",
    "Crop Protection and Environmental Biology",
    "Other",
  ],
  Technology: [
    "Agricultural and Environmental Engineering",
    "Civil Engineering",
    "Electrical and Electronic Engineering",
    "Mechanical Engineering",
    "Industrial and Production Engineering",
    "Petroleum Engineering",
    "Food Technology",
    "Wood Products Engineering",
    "Other",
  ],
  "Veterinary Medicine": ["Veterinary Medicine", "Other"],
  Pharmacy: ["Pharmacy", "Other"],
  "Public Health": ["Public Health", "Other"],
  "Clinical Sciences": [
    "Medicine",
    "Surgery",
    "Obstetrics and Gynaecology",
    "Paediatrics",
    "Psychiatry",
    "Other",
  ],
  "Basic Medical Sciences": [
    "Anatomy",
    "Physiology",
    "Biochemistry",
    "Other",
  ],
  Dentistry: ["Dentistry", "Other"],
  "Environmental Design and Management": [
    "Architecture",
    "Estate Management",
    "Urban and Regional Planning",
    "Other",
  ],
  "Renewable Natural Resources": [
    "Forest Production and Products",
    "Aquaculture and Fisheries Management",
    "Wildlife and Ecotourism Management",
    "Other",
  ],
  "Multidisciplinary Studies": ["Peace and Conflict Studies", "Other"],
  "Institute of African Studies": ["African Studies", "Other"],
  "Institute of Education": ["Education", "Other"],
  "Other / not stated": ["Not stated", "Other"],
};

export function departmentsFor(faculty?: string | null): readonly string[] {
  if (!faculty) return ["Other"];
  return DEPARTMENTS_BY_FACULTY[faculty] ?? ["Other"];
}

export const ICT_SUPPORT_EMAIL = "ict@pgcollege.ui.edu.ng";
export const ICT_SUPPORT_LABEL = "ICT unit, Postgraduate College";
