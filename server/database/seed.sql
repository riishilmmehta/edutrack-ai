-- EDUTrack AI Pro — Seed Data (MySQL 8.0+)
USE `edutrack_db`;

-- 1. Default Classes
INSERT INTO `classes` (`id`, `name`, `grade_level`, `section`) VALUES
(1, 'CSE Semester 1 - Sec A', 'Undergraduate', 'A'),
(2, 'CSE Semester 3 - Sec A', 'Undergraduate', 'A'),
(3, 'CSE Semester 5 - Sec B', 'Undergraduate', 'B')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Demo Users
-- Passwords:
-- 'password'  -> $2a$10$rUONLGTsCnDWKvbvJigA.eqX830ouYk0I1AZjv5q3GU5jkU8pQdny
-- 'GR2026036' -> $2a$10$0NOArWT4D0wFRdamlxMgsuEVl7U4YFS.NJJpWICyduJLQOuDFA8jy

INSERT INTO `users` (`id`, `name`, `email`, `institutional_email`, `password_hash`, `role`, `status`, `must_change_password`) VALUES
(1, 'Admin User', 'admin@edutrack.edu', 'admin@edutrack.edu', '$2a$10$rUONLGTsCnDWKvbvJigA.eqX830ouYk0I1AZjv5q3GU5jkU8pQdny', 'ADMIN', 'ACTIVE', 0),
(2, 'Dr. Priya Sharma', 'priya@edutrack.edu', 'priyasharma@edutrack.edu', '$2a$10$rUONLGTsCnDWKvbvJigA.eqX830ouYk0I1AZjv5q3GU5jkU8pQdny', 'TEACHER', 'ACTIVE', 0),
(3, 'Accountant Rajesh', 'accountant@edutrack.edu', 'accountant@edutrack.edu', '$2a$10$rUONLGTsCnDWKvbvJigA.eqX830ouYk0I1AZjv5q3GU5jkU8pQdny', 'ACCOUNTANT', 'ACTIVE', 0),
(4, 'Aarav Shah', 'aaravshah@vidhyadham.edu', 'aaravshah@edutrack.edu', '$2a$10$0NOArWT4D0wFRdamlxMgsuEVl7U4YFS.NJJpWICyduJLQOuDFA8jy', 'STUDENT', 'ACTIVE', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `password_hash` = VALUES(`password_hash`), `status` = VALUES(`status`);

-- 3. Teacher Profiles
INSERT INTO `teachers` (`id`, `user_id`, `department_id`) VALUES
(1, 2, 'Computer Science & Engineering')
ON DUPLICATE KEY UPDATE `department_id` = VALUES(`department_id`);

-- 4. Accountant Profiles
INSERT INTO `accountants` (`id`, `user_id`, `department`) VALUES
(1, 3, 'Finance & Bursar')
ON DUPLICATE KEY UPDATE `department` = VALUES(`department`);

-- 5. Student Profiles
INSERT INTO `students` (`id`, `user_id`, `gr_number`, `class_id`, `admission_year`) VALUES
(1, 4, 'GR2026036', 1, 2026)
ON DUPLICATE KEY UPDATE `gr_number` = VALUES(`gr_number`), `class_id` = VALUES(`class_id`);

-- 6. Sample Courses
INSERT INTO `courses` (`id`, `code`, `title`, `description`, `credits`, `class_id`, `teacher_user_id`) VALUES
(1, 'CS101', 'Introduction to Programming & Problem Solving', 'Foundational programming in Python and C', 4, 1, 2),
(2, 'CS102', 'Discrete Mathematics & Logic', 'Boolean algebra, graph theory, proof techniques', 3, 1, 2),
(3, 'CS201', 'Data Structures & Algorithms', 'Stacks, queues, trees, sorting, Big-O analysis', 4, 2, 2)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- 7. Sample Attendance
INSERT INTO `attendance` (`student_id`, `class_id`, `course_id`, `date`, `status`, `marked_by`, `remarks`) VALUES
(1, 1, 1, CURDATE(), 'PRESENT', 2, 'Attended CS101 Lecture'),
(1, 1, 2, CURDATE(), 'PRESENT', 2, 'Attended CS102 Lecture');

-- 8. Sample Grades
INSERT INTO `grades` (`student_id`, `course_id`, `assessment_type`, `score`, `max_score`, `graded_by`, `remarks`) VALUES
(1, 1, 'QUIZ', 18.50, 20.00, 2, 'Quiz 1 - Excellent algorithmic thinking'),
(1, 1, 'MIDTERM', 88.00, 100.00, 2, 'Midterm exam score'),
(1, 2, 'QUIZ', 19.00, 20.00, 2, 'Quiz 1 - Discrete Math logic');

-- 9. Sample Fees
INSERT INTO `fees` (`student_id`, `title`, `amount`, `due_date`, `status`, `remarks`) VALUES
(1, 'Fall 2026 Semester Tuition', 45000.00, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'PENDING', 'Academic Year 2026-27'),
(1, 'Annual Laboratory & Library Access Fee', 5000.00, CURDATE(), 'PAID', 'Receipt: RCPT-2026-0812');
