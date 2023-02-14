-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 14, 2023 at 10:26 AM
-- Server version: 10.4.27-MariaDB
-- PHP Version: 8.0.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `grading`
--

-- --------------------------------------------------------

--
-- Table structure for table `admissionlist`
--

CREATE TABLE `admissionlist` (
  `admissionid` int(11) NOT NULL,
  `studentid` int(11) NOT NULL,
  `schoolid` int(11) NOT NULL,
  `admited` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `choices`
--

CREATE TABLE `choices` (
  `choiceid` int(11) NOT NULL,
  `studentid` int(11) NOT NULL,
  `schoolid` int(11) NOT NULL,
  `choicelevel` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `choices`
--

INSERT INTO `choices` (`choiceid`, `studentid`, `schoolid`, `choicelevel`) VALUES
(102, 29, 1, 1),
(103, 29, 4, 2),
(104, 29, 5, 3),
(105, 29, 6, 4),
(106, 30, 4, 1),
(107, 30, 5, 2),
(108, 30, 6, 3),
(109, 30, 1, 4),
(110, 31, 1, 1),
(111, 31, 4, 2),
(112, 31, 6, 3),
(113, 31, 5, 4),
(114, 32, 4, 1),
(115, 32, 1, 2),
(116, 32, 6, 3),
(117, 32, 5, 4),
(118, 33, 6, 1),
(119, 33, 5, 2),
(120, 33, 4, 3),
(121, 33, 1, 4),
(122, 34, 1, 1),
(123, 34, 4, 2),
(124, 34, 5, 3),
(125, 34, 6, 4),
(126, 35, 5, 1),
(127, 35, 6, 2),
(128, 35, 1, 3),
(129, 35, 4, 4),
(130, 36, 5, 1),
(131, 36, 6, 2),
(132, 36, 1, 3),
(133, 36, 4, 4),
(134, 37, 4, 1),
(135, 37, 6, 2),
(136, 37, 1, 3),
(137, 37, 6, 4),
(138, 38, 4, 1),
(139, 38, 1, 2),
(140, 38, 5, 3),
(141, 38, 6, 4),
(142, 39, 5, 1),
(143, 39, 6, 2),
(144, 39, 1, 3),
(145, 39, 4, 4),
(146, 40, 5, 1),
(147, 40, 6, 2),
(148, 40, 1, 3),
(149, 40, 4, 4),
(150, 41, 6, 1),
(151, 41, 5, 2),
(152, 41, 1, 3),
(153, 41, 4, 4),
(154, 42, 5, 1),
(155, 42, 6, 2),
(156, 42, 4, 3),
(157, 42, 1, 4),
(158, 43, 1, 1),
(159, 43, 6, 2),
(160, 43, 4, 3),
(161, 43, 5, 4),
(162, 44, 4, 1),
(163, 44, 1, 2),
(164, 44, 6, 3),
(165, 44, 5, 4),
(166, 45, 4, 1),
(167, 45, 1, 2),
(168, 45, 6, 3),
(169, 45, 5, 4),
(170, 46, 4, 1),
(171, 46, 5, 2),
(172, 46, 6, 3),
(173, 46, 1, 4),
(174, 47, 4, 1),
(175, 47, 1, 2),
(176, 47, 5, 3),
(177, 47, 6, 4),
(178, 48, 4, 1),
(179, 48, 1, 2),
(180, 48, 5, 3),
(181, 48, 6, 4),
(182, 49, 4, 1),
(183, 49, 1, 2),
(184, 49, 5, 3),
(185, 49, 6, 4),
(186, 50, 6, 1),
(187, 50, 5, 2),
(188, 50, 4, 3),
(189, 50, 1, 4),
(190, 51, 5, 1),
(191, 51, 6, 2),
(192, 51, 4, 3),
(193, 51, 1, 4);

-- --------------------------------------------------------

--
-- Table structure for table `schools`
--

CREATE TABLE `schools` (
  `schoolid` int(11) NOT NULL,
  `schoolname` varchar(150) NOT NULL,
  `cutoffpoints` int(11) NOT NULL,
  `noofstudent` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `schools`
--

INSERT INTO `schools` (`schoolid`, `schoolname`, `cutoffpoints`, `noofstudent`) VALUES
(1, 'Buddo SS', 20, 10),
(4, 'Ntare School', 8, 12),
(5, 'St .Mary\'s Kisubi ', 14, 10),
(6, 'St .Mary\'s Kitende', 14, 10);

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `studentid` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `dob` date NOT NULL,
  `aggregate` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`studentid`, `name`, `dob`, `aggregate`) VALUES
(29, 'john smith ', '2002-05-14', 8),
(30, 'jane doe', '2003-08-21', 9),
(31, 'Micheal chen', '2001-11-30', 9),
(32, 'sarah lee', '2002-02-14', 10),
(33, 'David kim', '2003-06-01', 9),
(34, 'Maria Rodriguez', '2002-04-25', 13),
(35, 'Carlos Lopez', '2003-01-07', 18),
(36, 'Anna smith', '2002-08-12', 14),
(37, 'Sam lee', '2001-12-02', 11),
(38, 'Olivia Davis', '2003-03-19', 9),
(39, 'Ethan Brown', '2002-06-22', 11),
(40, 'Emma Garcia ', '2001-10-16', 14),
(41, 'Lucas Martin', '2003-07-05', 11),
(42, 'Sophia perez', '2002-02-28', 8),
(43, 'jacob hernandez', '2001-11-12', 9),
(44, 'mia miller', '2003-05-01', 10),
(45, 'william kim', '2002-09-24', 10),
(46, 'chloe rodriguez', '2001-12-18', 8),
(47, 'daniel johnson', '2003-04-07', 11),
(48, 'isabella wilson ', '2002-01-01', 12),
(49, 'Ryan Brown', '2001-10-26', 10),
(50, 'Victoria Davis', '2003-07-13', 9),
(51, 'Samuel garcia', '2002-03-07', 8);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admissionlist`
--
ALTER TABLE `admissionlist`
  ADD PRIMARY KEY (`admissionid`),
  ADD KEY `schoolid` (`schoolid`),
  ADD KEY `studentid` (`studentid`);

--
-- Indexes for table `choices`
--
ALTER TABLE `choices`
  ADD PRIMARY KEY (`choiceid`),
  ADD KEY `schoolid` (`schoolid`),
  ADD KEY `studentid` (`studentid`);

--
-- Indexes for table `schools`
--
ALTER TABLE `schools`
  ADD PRIMARY KEY (`schoolid`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`studentid`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admissionlist`
--
ALTER TABLE `admissionlist`
  MODIFY `admissionid` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `choices`
--
ALTER TABLE `choices`
  MODIFY `choiceid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=194;

--
-- AUTO_INCREMENT for table `schools`
--
ALTER TABLE `schools`
  MODIFY `schoolid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `studentid` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admissionlist`
--
ALTER TABLE `admissionlist`
  ADD CONSTRAINT `admissionlist_ibfk_1` FOREIGN KEY (`schoolid`) REFERENCES `schools` (`schoolid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `admissionlist_ibfk_2` FOREIGN KEY (`studentid`) REFERENCES `students` (`studentid`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `choices`
--
ALTER TABLE `choices`
  ADD CONSTRAINT `choices_ibfk_1` FOREIGN KEY (`schoolid`) REFERENCES `schools` (`schoolid`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `choices_ibfk_2` FOREIGN KEY (`studentid`) REFERENCES `students` (`studentid`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
