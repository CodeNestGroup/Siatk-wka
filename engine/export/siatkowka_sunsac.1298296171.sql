# MySQL dump of database 'siatkowka' on host '127.0.0.1'
# backup date and time: 2011-02-21 14:49:31
# built by phpMyBackupPro v.2.1
# http://www.phpMyBackupPro.net


# ring constraints workaround
SET FOREIGN_KEY_CHECKS=0;
SET AUTOCOMMIT=0;
START TRANSACTION;


### structure of table `es_comment` ###

DROP TABLE IF EXISTS `es_comment`;

CREATE TABLE `es_comment` (
  `escom_id` varchar(32) NOT NULL,
  `escom_addedby` varchar(32) NOT NULL,
  `escom_desc` text NOT NULL,
  `esmat_id` varchar(32) NOT NULL,
  `escom_active` enum('0','1') NOT NULL,
  `escom_createdate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`escom_id`),
  KEY `esmat_id` (`esmat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_comment` ###

insert into `es_comment` values ('b84ac', 'admin', 'test', '1cec9', '1', '2011-02-21 12:05:47');


### structure of table `es_lang` ###

DROP TABLE IF EXISTS `es_lang`;

CREATE TABLE `es_lang` (
  `eslg_id` varchar(32) NOT NULL DEFAULT '',
  `eslg_symbol` varchar(3) NOT NULL DEFAULT '',
  `eslg_content` longtext,
  PRIMARY KEY (`eslg_id`,`eslg_symbol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_lang` ###

insert into `es_lang` values ('0057b', 'pl', '');
insert into `es_lang` values ('1', 'en', '');
insert into `es_lang` values ('1', 'pl', 'Siatk√≥wka');
insert into `es_lang` values ('19b30', 'pl', 'Pracownicy');
insert into `es_lang` values ('2', 'en', '');
insert into `es_lang` values ('2', 'pl', 'Siatk√≥wka');
insert into `es_lang` values ('3', 'en', '');
insert into `es_lang` values ('3', 'pl', 'Siatk√≥wka\r\n');
insert into `es_lang` values ('3f750', 'pl', '');
insert into `es_lang` values ('4923e', 'pl', '');
insert into `es_lang` values ('4bdf7', 'pl', 'Plan lekcji');
insert into `es_lang` values ('4f9a5', 'pl', '');
insert into `es_lang` values ('597e0', 'pl', '');
insert into `es_lang` values ('5d1c0', 'pl', 'Historia');
insert into `es_lang` values ('792ef', 'pl', 'Misja szko??y');
insert into `es_lang` values ('8d8ef', 'pl', '&lt;div&gt;Wprowadzenie artyku??u&lt;/div&gt;');
insert into `es_lang` values ('9ac69', 'pl', '');
insert into `es_lang` values ('9ac6c', 'pl', '');
insert into `es_lang` values ('9cb41', 'pl', '');
insert into `es_lang` values ('aaae3', 'pl', '');
insert into `es_lang` values ('b0c05', 'pl', 'Pozosta??e linki');
insert into `es_lang` values ('c5570', 'pl', 'Galerie');
insert into `es_lang` values ('d5d10', 'pl', '');
insert into `es_lang` values ('d8f8d', 'pl', 'Status');
insert into `es_lang` values ('d9ef9', 'pl', 'Historia');
insert into `es_lang` values ('df369', 'pl', 'Edukacja i wychowanie');
insert into `es_lang` values ('eaee5', 'pl', 'Osiƒ?gniƒ?cia szko??y');
insert into `es_lang` values ('fdd55', 'pl', '&lt;div&gt;Tre??ƒ? artyku??u&lt;/div&gt;');


### structure of table `es_matches` ###

DROP TABLE IF EXISTS `es_matches`;

CREATE TABLE `es_matches` (
  `esmat_id` varchar(32) NOT NULL,
  `esmat_createdate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `esmat_matchdate` date NOT NULL,
  `esmat_matchbegintime` time NOT NULL,
  `esmat_matchendtime` time NOT NULL,
  `esmat_slots` int(2) NOT NULL,
  `esmat_comment` text,
  PRIMARY KEY (`esmat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_matches` ###

insert into `es_matches` values ('1c2ed', '2011-02-21 11:15:25', '2011-01-31', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('1cec9', '2011-02-21 11:15:26', '2011-03-28', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('2a2fe', '2011-02-21 11:15:26', '2011-03-14', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('39269', '2011-02-21 11:15:26', '2011-03-07', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('47201', '2011-02-21 11:15:25', '2011-01-24', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('54dd1', '2011-02-21 11:15:25', '2011-01-17', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('5ae38', '2011-02-21 11:15:25', '2011-01-10', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('6eb9a', '2011-02-21 11:15:25', '2011-01-03', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('70493', '2011-02-21 11:15:25', '2011-02-21', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('82c8c', '2011-02-21 11:15:25', '2011-02-14', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('b991e', '2011-02-21 11:15:25', '2011-02-07', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('f1981', '2011-02-21 11:15:26', '2011-03-21', '20:00:00', '22:00:00', '12', null);
insert into `es_matches` values ('f3fc0', '2011-02-21 11:15:25', '2011-02-28', '20:00:00', '22:00:00', '12', null);


### structure of table `es_matchesuserstatus` ###

DROP TABLE IF EXISTS `es_matchesuserstatus`;

CREATE TABLE `es_matchesuserstatus` (
  `esmat_id` varchar(32) NOT NULL,
  `essysus_login` varchar(32) NOT NULL,
  `esmus_status` enum('0','1') NOT NULL,
  `esmus_signupdatetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `esmat_id` (`esmat_id`),
  KEY `essysus_login` (`essysus_login`),
  CONSTRAINT `es_matchesuserstatus_ibfk_1` FOREIGN KEY (`essysus_login`) REFERENCES `es_sysusers` (`essysus_login`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_matchesuserstatus` ###

insert into `es_matchesuserstatus` values ('6eb9a', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('6eb9a', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('6eb9a', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('6eb9a', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('5ae38', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('5ae38', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('5ae38', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('5ae38', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('54dd1', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('54dd1', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('54dd1', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('54dd1', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('47201', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('47201', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('47201', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('47201', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('1c2ed', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('1c2ed', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('1c2ed', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('1c2ed', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('b991e', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('b991e', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('b991e', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('b991e', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('82c8c', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('82c8c', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('82c8c', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('82c8c', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('70493', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('70493', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('70493', 'Iwan Nowak', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('70493', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('f3fc0', 'Amadej Olszewski', '1', '2011-02-21 11:15:25');
insert into `es_matchesuserstatus` values ('f3fc0', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('f3fc0', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('f3fc0', 'Iwan Nowak', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('39269', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('39269', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('39269', 'Iwan Nowak', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('39269', 'Amadej Olszewski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('2a2fe', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('2a2fe', 'Iwan Nowak', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('2a2fe', 'Amadej Olszewski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('2a2fe', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('f1981', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('f1981', 'Iwan Nowak', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('f1981', 'Amadej Olszewski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('f1981', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('1cec9', 'Bratumi≈Ç Soko≈Çowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('1cec9', 'Amadej Olszewski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('1cec9', 'Celestyn DƒÖbrowski', '1', '2011-02-21 11:15:26');
insert into `es_matchesuserstatus` values ('1cec9', 'Iwan Nowak', '1', '2011-02-21 11:15:26');


### structure of table `es_matchrates` ###

DROP TABLE IF EXISTS `es_matchrates`;

CREATE TABLE `es_matchrates` (
  `esrat_id` int(11) NOT NULL,
  `esmat_id` varchar(32) NOT NULL,
  `esrat_usrlogin` varchar(32) NOT NULL,
  `esrat_rate` int(11) NOT NULL,
  PRIMARY KEY (`esrat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_matchrates` ###

insert into `es_matchrates` values ('0', 'ecd3a', 'admin', '4');
insert into `es_matchrates` values ('2', 'ea9d6', 'admin', '5');
insert into `es_matchrates` values ('3', '8f815', 'admin', '1');
insert into `es_matchrates` values ('208', '8d25e', 'admin', '3');
insert into `es_matchrates` values ('971', 'a9a81', 'admin', '2');


### structure of table `es_section` ###

DROP TABLE IF EXISTS `es_section`;

CREATE TABLE `es_section` (
  `essec_id` varchar(32) NOT NULL DEFAULT '',
  `essec_titleid` varchar(32) NOT NULL DEFAULT '',
  `essec_descid` varchar(32) DEFAULT NULL,
  `essec_active` enum('0','1') NOT NULL DEFAULT '1',
  PRIMARY KEY (`essec_id`),
  KEY `search_index` (`essec_active`),
  KEY `es_section_join` (`essec_titleid`,`essec_descid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_section` ###

insert into `es_section` values ('34c15', '7a8e2', '88a8a', '1');
insert into `es_section` values ('9b22b', 'dfdc5', 'f1319', '1');


### structure of table `es_system` ###

DROP TABLE IF EXISTS `es_system`;

CREATE TABLE `es_system` (
  `essys_name` varchar(45) NOT NULL DEFAULT '',
  `essys_contentid` varchar(32) DEFAULT NULL,
  `essys_content` text,
  PRIMARY KEY (`essys_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_system` ###

insert into `es_system` values ('descriptionhtml', '2', null);
insert into `es_system` values ('field1', '', 'Browary restauracyjne o wydajno??ci:');
insert into `es_system` values ('foot', 'foot', 'Wszelkie prawa zastrze??one');
insert into `es_system` values ('keywordhtml', '3', null);
insert into `es_system` values ('title', '1', null);


### structure of table `es_sysusers` ###

DROP TABLE IF EXISTS `es_sysusers`;

CREATE TABLE `es_sysusers` (
  `essysus_login` varchar(32) NOT NULL DEFAULT '',
  `esurole_id` varchar(32) DEFAULT NULL,
  `essysus_passwd` varchar(32) NOT NULL DEFAULT '',
  `essysus_desc` varchar(255) DEFAULT NULL,
  `essysus_email` blob,
  `essysus_createdate` int(10) unsigned NOT NULL DEFAULT '0',
  `essysus_lastlogin` int(10) unsigned DEFAULT NULL,
  `essysus_counter` int(10) unsigned DEFAULT '0',
  `essysus_autosignup` enum('0','1') NOT NULL,
  `essysus_active` enum('0','1') NOT NULL DEFAULT '1',
  PRIMARY KEY (`essysus_login`),
  KEY `es_sysusers_fk` (`esurole_id`),
  CONSTRAINT `es_sysusers_ibfk_1` FOREIGN KEY (`esurole_id`) REFERENCES `es_user_role` (`esurole_id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_sysusers` ###

insert into `es_sysusers` values ('admin', 'ADMINISTRATOR', '21232f297a57a5a743894a0e4a801fc3', 'Administrator', 'ß„ïó€≥[_BÚRŸÔé^√b‹u\"', '1237537838', '1298296075', '159', '0', '1');
insert into `es_sysusers` values ('Amadej Olszewski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297934150', '1297950860', '1', '1', '1');
insert into `es_sysusers` values ('Bogumi≈Ç Kowalczyk', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297933945', null, '0', '0', '1');
insert into `es_sysusers` values ('Bratumi≈Ç Soko≈Çowski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297934096', null, '0', '1', '1');
insert into `es_sysusers` values ('Celestyn DƒÖbrowski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297934176', '1297950405', '1', '1', '1');
insert into `es_sysusers` values ('Grzegorz Michalski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297934042', null, '0', '0', '1');
insert into `es_sysusers` values ('Gustaw Kucharski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297933903', null, '0', '0', '1');
insert into `es_sysusers` values ('Iwan Nowak', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297934122', '1298284004', '3', '1', '1');
insert into `es_sysusers` values ('Jozafat Wi≈õniewski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297933925', null, '0', '0', '1');
insert into `es_sysusers` values ('Krzysztof Nowakowski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297933881', null, '0', '0', '1');
insert into `es_sysusers` values ('Ludwik DƒÖbrowski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297934017', null, '0', '0', '1');
insert into `es_sysusers` values ('Szczeosny ZajƒÖc', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297934069', null, '0', '0', '1');
insert into `es_sysusers` values ('Szczepan Grabowski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297933995', null, '0', '0', '1');
insert into `es_sysusers` values ('Wojciech Nowakowski', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297933852', null, '0', '0', '1');
insert into `es_sysusers` values ('Zygfryd Kr√≥l', 'ZAWODNIK', '05a671c66aefea124cc08b76ea6d30bb', '', 'ßìá#Z3 Úô“(LJ bgò„Q8≥áy§Rçí', '1297933971', null, '0', '0', '1');


### structure of table `es_tpl` ###

DROP TABLE IF EXISTS `es_tpl`;

CREATE TABLE `es_tpl` (
  `estpl_id` varchar(32) NOT NULL DEFAULT '',
  `estpl_name` varchar(32) NOT NULL DEFAULT '',
  `estpl_filename` varchar(32) NOT NULL DEFAULT '',
  `estpl_articlestep` int(3) DEFAULT NULL,
  PRIMARY KEY (`estpl_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_tpl` ###



### structure of table `es_user_role` ###

DROP TABLE IF EXISTS `es_user_role`;

CREATE TABLE `es_user_role` (
  `esurole_id` varchar(32) NOT NULL DEFAULT '',
  `esurole_name` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`esurole_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


### data of table `es_user_role` ###

insert into `es_user_role` values ('ADMINISTRATOR', 'Administrator');
insert into `es_user_role` values ('ZAWODNIK', 'Zawodnik');


# ring constraints workaround
SET FOREIGN_KEY_CHECKS=1;
COMMIT;
