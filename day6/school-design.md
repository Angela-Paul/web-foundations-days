# School Database Design

This database stores students, the courses they take, and which student is enrolled on which course. It has three tables: `students`, `courses` and `enrolments`.

## Tables

### students
Stores one row per student.
- `id`: primary key, a unique number for each student.
- `name`: the student's full name (required).
- `email`: the student's email (required and unique, so two students cannot share one).

### courses
Stores one row per course.
- `id`: primary key.
- `code`: a short unique course code, such as WD101.
- `title`: the course name (required).

### enrolments
Stores one row each time a student is enrolled on a course. This is the join table.
- `id`: primary key.
- `student_id`: foreign key pointing to `students.id`.
- `course_id`: foreign key pointing to `courses.id`.
- `grade`: the student's grade on that course. It can be empty until the course is graded.
- A `UNIQUE (student_id, course_id)` rule stops the same student from being enrolled on the same course twice.

## Relationships

- **One-to-many: students to enrolments.** One student can have many enrolments, but each enrolment belongs to exactly one student.
- **One-to-many: courses to enrolments.** One course can have many enrolments, but each enrolment belongs to exactly one course.
- **Many-to-many: students to courses.** One student can take many courses, and one course can have many students. This relationship is made from the two one-to-many relationships above.

### Why a join table is needed

A relational table cell can hold only one value, so a student row cannot store a list of courses, and a course row cannot store a list of students. Storing a comma-separated list would make searching and counting hard and would break the rule of one value per cell. Repeating whole student rows for every course would waste space and let the data go out of sync. The `enrolments` join table solves this by storing one row for each student and course pair, linked by foreign keys.

## Index

I would add an index on `enrolments(course_id)`. The queries "which students are on this course?" and "how many students are on each course?" look up enrolments by `course_id`. Without an index, the database must read every row in `enrolments` to find them. With the index, it jumps straight to the matching rows, like using the index at the back of a book. This matters more as the school grows to thousands of enrolments.

## SQL or NoSQL?

I would choose SQL for this system. School data is highly structured and full of relationships: students, courses and enrolments always link to each other in the same way. SQL enforces these links with foreign keys, enforces rules like unique emails and no double enrolment, and answers questions across tables with joins. Accuracy matters a lot for records such as grades, and SQL databases protect this with transactions, which make sure a change is saved completely or not at all. A NoSQL database would be more useful if the data had no fixed shape, or if it were huge and needed to be spread across many servers, but a school's records fit neatly into tables.