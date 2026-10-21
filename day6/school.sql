-- school.sql: students, courses and enrolments

PRAGMA foreign_keys = ON;

-- Start clean so the script can be run again (child table dropped first)
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ---------- TABLES ----------

CREATE TABLE students (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  code  TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL
);

-- Join table: one row = one student enrolled on one course
CREATE TABLE enrolments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id  INTEGER NOT NULL,
  grade      TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE,
  UNIQUE (student_id, course_id)
);

-- Speeds up "all students on a course" lookups
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);

-- ---------- DATA ----------

INSERT INTO students (name, email) VALUES
  ('Wanjiku Kamau',   'wanjiku@example.com'),
  ('Otieno Odhiambo', 'otieno@example.com'),
  ('Amina Hassan',    'amina@example.com'),
  ('Brian Kiprop',    'brian@example.com');

INSERT INTO courses (code, title) VALUES
  ('WD101', 'Web Development'),
  ('DB201', 'Database Systems'),
  ('BC110', 'Business Communication');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 'B'),
  (1, 2, NULL),
  (2, 1, 'A'),
  (2, 3, 'C'),
  (3, 1, NULL),
  (3, 2, 'B');

-- ---------- QUERIES ----------

-- 1. All courses for one student (by name)
SELECT courses.title
FROM students
JOIN enrolments ON enrolments.student_id = students.id
JOIN courses    ON courses.id = enrolments.course_id
WHERE students.name = 'Wanjiku Kamau';

-- 2. All students on one course
SELECT students.name
FROM courses
JOIN enrolments ON enrolments.course_id = courses.id
JOIN students   ON students.id = enrolments.student_id
WHERE courses.title = 'Web Development';

-- 3. Number of students per course
SELECT courses.title, COUNT(enrolments.id) AS number_of_students
FROM courses
LEFT JOIN enrolments ON enrolments.course_id = courses.id
GROUP BY courses.id, courses.title;

-- 4. Students who have no enrolments
SELECT students.name
FROM students
LEFT JOIN enrolments ON enrolments.student_id = students.id
WHERE enrolments.id IS NULL;

-- 5. Update one enrolment's grade (Wanjiku, Database Systems, now graded A)
UPDATE enrolments
SET grade = 'A'
WHERE student_id = 1 AND course_id = 2;