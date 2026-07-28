<?php
/*
 +--------------------------------------------------------------------------+
 | phpMyBackupPro                                                           |
 +--------------------------------------------------------------------------+
 | Copyright (c) 2004-2007 by Dirk Randhahn                                 |                               
 | http://www.phpMyBackupPro.net                                            |
 | version information can be found in definitions.php.                     |
 |                                                                          |
 | This program is free software; you can redistribute it and/or            |
 | modify it under the terms of the GNU General Public License              |
 | as published by the Free Software Foundation; either version 2           |
 | of the License, or (at your option) any later version.                   |
 |                                                                          |
 | This program is distributed in the hope that it will be useful,          |
 | but WITHOUT ANY WARRANTY; without even the implied warranty of           |
 | MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            |
 | GNU General Public License for more details.                             |
 |                                                                          |
 | You should have received a copy of the GNU General Public License        |
 | along with this program; if not, write to the Free Software              |
 | Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA 02111-1307,USA.|
 +--------------------------------------------------------------------------+
*/

/*basic data*/
define('BD_LANG_SHORTCUT',"pl"); // used for the php function setlocale() (http://www.php.net/setlocale)
define('BD_DATE_FORMAT',"%x %X"); // used for the php function strftime() (http://www.php.net/strftime)
define('BD_CHARSET_HTML',"UTF-8"); // the charset used in you language for html
define('BD_CHARSET_EMAIL',"ISO-8859-2"); // the charset used in your langauge for MIME-emails

/*functions.inc.php*/
define('F_START',"start");
define('F_CONFIG',"konfiguracja");
define('F_IMPORT',"import");
define('F_BACKUP',"kopia zapasowa");
define('F_SCHEDULE',"zaplanowana kopia zapasowa");
define('F_DB_INFO',"informacje o bazie danych");
define('F_SQL_QUERY',"zapytania sql");
define('F_HELP',"pomoc(en)");
define('F_LOGOUT',"wyloguj");
define('F_FOOTER',"Visit the %sphpMyBackupPro project site%s for new releases and news.");
define('F_NOW_AVAILABLE',"A new version of phpMyBackupPro is now available on %s".PMBP_WEBSITE."%s");
define('F_SELECT_DB',"Wybierz bazę danych");
define('F_SELECT_ALL',"zaznacz wszystkie");
define('F_COMMENTS',"Komentarze");
define('F_EX_TABLES',"export tabel");
define('F_EX_DATA',"export danych");
define('F_EX_DROP',"dodaj 'drop table'");
define('F_EX_COMP',"kompresja");
define('F_EX_OFF',"brak");
define('F_EX_GZIP',"gzip");
define('F_EX_ZIP',"zip");
define('F_DEL_FAILED',"Nieudana próba usunięcia kopii %s");
define('F_FTP_1',"Nieudane połączenie z serwerem FTP");
define('F_FTP_2',"Nieudana próba zalogowania użytkownika");
define('F_FTP_3',"Wysłanie przez FTP nie powiodło się");
define('F_FTP_4',"Plik został pomyślnie załadoway jako:");
define('F_FTP_5',"FTP: Usunięcie pliku '%s' nie udało się");
define('F_FTP_6',"Plik '%s' został pomyślnie usunięty z serwera");
define('F_FTP_7',"Plik '%s' nie jest dostępny na serwerze");
define('F_MAIL_1',"Jeden adresat maila jest zły");
define('F_MAIL_2',"Ta wiadomość została wysłana przez phpMyBackupPro ".PMBP_VERSION." ".PMBP_WEBSITE." działającej na on");
define('F_MAIL_3',"nie mogło być odczytane");
define('F_MAIL_4',"MySQL kopia zapasowa z");
define('F_MAIL_5',"Wiadomość nie mogła być wysłana");
define('F_MAIL_6',"Plik pomyślnie wysłany");
define('F_YES',"tak");
define('F_NO',"nie");
define('F_DURATION',"Czas trwania");
define('F_SECONDS',"sekund");

/*index.php*/
define('I_SQL_ERROR',"ERROR: Proszę załadować dane MySQL-owe w 'konfiguracji'!");
define('I_NAME',"To jest phpMyBackupPro");
define('I_WELCOME',"phpMyBackupPro is licensed under the GNU GPL.<br>
For help try the online help or visit %s.<br><br>
Choose in the top menu what you want to do next! If this is your first time using phpMyBackupPro you should start with the configuration!
The rights of the directory 'export' and the file 'global_conf.php' must be set to 0777.");
define('I_CONF_ERROR',"Plik ".PMBP_GLOBAL_CONF." nie jest zapisywalny!");
define('I_DIR_ERROR',"Katalog ".PMBP_EXPORT_DIR." nie jest zapisywalny!");
define('PMBP_I_INFO',"Informacje systemowe");
define('PMBP_I_SERVER',"Serwer");
define('PMBP_I_TIME',"Czas");
define('PMBP_I_PHP_VERS',"Wersja PHP");
define('PMBP_I_MEM_LIMIT',"PHP Limit Pamięci");
define('PMBP_I_SAFE_MODE',"Tryb bezpieczny");
define('PMBP_I_FTP',"FTP transfer możliwy");
define('PMBP_I_MAIL',"Wysyłanie Emaili:");
define('PMBP_I_GZIP',"Możliwość kompresji gzip");
define('PMBP_I_SQL_SERVER',"MySQL Server");
define('PMBP_I_SQL_CLIENT',"MySQL Client");
define('PMBP_I_NO_RES',"*Nie może zostać odzyskany*");
define('PMBP_I_LAST_SCHEDULED',"Ostatnia planowana kopia zapasowa");
define('PMBP_I_LAST_LOGIN',"Ostatnie logowanie");
define('PMBP_I_LAST_LOGIN_ERROR',"Ostatnie niepoprawne logowanie");

/*config.php*/
define('C_SITENAME',"nazwa strony");
define('C_LANG',"język");
define('C_SQL_HOST',"nazwa hosta MySQL");
define('C_SQL_USER',"nazwa użytkownika MySQL");
define('C_SQL_PASSWD',"hasło MySQL");
define('C_SQL_DB',"tylko ta baza danych");
define('C_FTP_USE',"zapisz kopię zapasową przez FTP?");
define('C_FTP_BACKUP',"użyj biblioteki kopi zapasowej?");
define('C_FTP_REC',"backup directories recursively?");
define('C_FTP_SERVER',"FTP server (url or IP)");
define('C_FTP_USER',"Nazwa użytkownika FTP");
define('C_FTP_PASSWD',"Hasło FTP");
define('C_FTP_PATH',"ścieżka FTP");
define('C_FTP_PASV',"użyj pasywnego ftp?");
define('C_FTP_PORT',"Port FTP");
define('C_FTP_DEL',"usuń pliki na serwerze FTP");
define('C_EMAIL_USE',"użyj email?");
define('C_EMAIL',"adres email");
define('C_STYLESHEET',"skórka");
define('C_DATE',"format daty");
define('C_DEL_TIME',"usuwaj lokalne kopie po x dniach");
define('C_DEL_NUMBER',"trzymaj x plików na bazę danych");
define('C_TIMELIMIT',"php limit czasu");
define('C_IMPORT_ERROR',"pokaż błędy importu?");
define('C_NO_LOGIN',"wyłącz funkcję logowania?");
define('C_LOGIN',"autoryzacja HTTP?");
define('C_DIR_BACKUP',"włącz kopię zapasową biblioteki?");
define('C_DIR_REC',"kopia zapasowa biblioteki z podbibliotekami?");
define('C_CONFIRM',"poziom potwierdzenia");
define('C_CONFIRM_1',"empty, delete, import");
define('C_CONFIRM_2',"... all");
define('C_CONFIRM_3',"... ALL");
define('C_CONFIRM_4',"don't confirm anything");

define('C_BASIC_VAL',"Standardowa konfiguracja");
define('C_EXT_VAL',"Rozszerzona konfiguracja");
define('PMBP_C_SYSTEM_VAL',"Zmienne systemowe");
define('PMBP_C_SYS_WARNING',"Te zmienne systemow są zarządzane przez phpMyBackupPro. Nie modyfikuj ich jeśli nie wiesz co robisz!");
define('C_TITLE_SQL',"Dane SQL");
define('C_TITLE_FTP',"Ustawienia FTP");
define('C_TITLE_EMAIL',"Kopia zapasowa przez email");
define('C_TITLE_STYLE',"Styl phpMyBackupPro");
define('C_TITLE_DELETE',"Automatyczne usuwanie plików kopii zapasowych");
define('C_TITLE_CONFIG',"Przyszła konfiguracja pozycji");
define('C_WRONG_TYPE',"jest nie poprawne!");
define('C_WRONG_SQL',"dane MySQL są niepoprwane!");
define('C_WRONG_DB',"Nazwa bazy MySQL jest niepoprawna!");
define('C_WRONG_FTP',"Dane FTP są niepoprawne!");
define('C_OPEN',"Nie można otworzyć");
define('C_WRITE',"Nie można zapisać do ");
define('C_SAVED',"Dane pomyślnie zapisane");
define('C_WRITEABLE',"nie jest możliwe zapisanie");
define('C_SAVE',"Save data");

/*import.php*/
define('IM_ERROR',"%d błędów. Możesz użyć 'pustej bazy danych' aby mieć pewność, że nie zawiera żadnych tabel.");
define('IM_SUCCESS',"Pomyślnie zaimportowano");
define('IM_TABLES',"tabele i");
define('IM_ROWS',"wiersze");

define('B_EMPTIED_ALL',"Wszystkie bazy danych zostały pomyslnie opróżnione");
define('B_EMPTIED',"Baza dancych została pomyślnie opróżniona");
define('B_DELETED',"Plik został pomyslnie usunięty");
define('B_DELETED_ALL',"Wszystkie pliki zostały pomyślnie usunięte");
define('B_NO_FILES',"Aktualnie nie ma żadnych plików z kopiami zapasowymi");
define('B_DELETE_ALL_2',"usun WSZYSKIE kopie zapasowe");
define('B_IMPORT_ALL',"importuj WSZYSTKIE kopie zapasowe");
define('B_EMPTY_ALL',"opróżnij WSZYSTKIE puste bazy danych");
define('B_EMPTY_DB',"pusta baza danych");
define('B_DELETE_ALL',"usuń wszystkie kopie zapasowe");
define('B_INFO',"info");
define('B_VIEW',"widok");
define('B_DOWNLOAD',"pobierz");
define('B_IMPORT',"import");
define('B_IMPORT_FRAG',"pofragmentowane");
define('B_DELETE',"usuń");
define('B_CONF_EMPTY_DB',"Czy napewno chcesz opróżnić bazę danych?");
define('B_CONF_DEL_ALL',"Napewno chcesz usunąć wszyskie kopie zapasowe tej bazy danych?");
define('B_CONF_IMP',"Napewno chcesz zaimportować tą kopię zapasową?");
define('B_CONF_DEL',"Napewno chcesz usunąć tą kopię zapasową?");
define('B_CONF_EMPT_ALL',"Czy napewno chcesz opróżnić WSZYSTKIE bazy danych?");
define('B_CONF_IMP_ALL',"Czy napewno chcesz zaimportować WSZYSTKIE ostanie kopie zapasowe?");
define('B_CONF_DEL_ALL_2',"Czy napewno chcesz usunąć WSZYSTKIE kopie zapasowe?");
define('B_LAST_BACKUP',"Ostatnia utworzona kopia");
define('B_SIZE_SUM',"Całkowity rozmiar wszystkich kopii zapasowych");

/*backup.php*/
define('EX_SAVED',"Flik pomyślnie zapisany jako");
define('EX_NO_DB',"Nie wybrano bazy danych");
define('EX_EXPORT',"Kopia zapasowa");
define('EX_NOT_SAVED',"Nie można zapisać kopii zapasowej %s w '%s'");
define('EX_DIRS',"Wybierz bibliotekę kopii zapasowej dla serwera FTP");
define('EX_DIRS_MAN',"Enter more directory paths relative to the phpMyBackupPro directory.<br>Separate with '|'");
define('EX_PACKED',"Skapuj wszystko w jednym pliku ZIP");
define('PMBP_EX_NO_AVAILABLE',"Baza danych %s jest niedostępna");
define('PMBP_EXS_UPDATE_DIRS',"Aktualizuj listę bibliotek");
define('PMBP_EX_NO_ARGV',"PRzykłady użycia:\n$ php backup.php db1,db2,db3
For more functions please read 'SHELL_MODE.txt' in the 'documentation' directory");

/*scheduled.php*/
define('EXS_PERIOD',"Wybierz okres kopii");
define('EXS_PATH',"Wybierz katalog w którym będą umieszczone pliki PHP");
define('EXS_BACK',"powrót");
define('PMBP_EXS_ALWAYS',"Przy każdym wywołaniu");
define('EXS_HOUR',"godzinę");
define('EXS_HOURS',"godzin");
define('EXS_DAY',"dzień");
define('EXS_DAYS',"dni");
define('EXS_WEEK',"tydzień");
define('EXS_WEEKS',"tygodnie");
define('EXS_MONTH',"miesiąc");
define('EXS_SHOW',"Pokaż skrypt");
define('PMBP_EXS_INCL',"Include this script in the PHP file (%s) you want to do the backup job");
define('PMBP_EXS_SAVE',"or save this script to a new file (will overwrite an existing file!)");

/*file_info.php*/
define('INF_INFO',"info");
define('INF_DATE',"Data");
define('INF_DB',"Baza danych");
define('INF_SIZE',"Rozmiar kopii zapasowej");
define('INF_COMP',"Jest zkompresowana");
define('INF_DROP',"zawaiera 'usunięte tabele'");
define('INF_TABLES',"Zawiera tabele");
define('INF_DATA',"Zawiera dane");
define('INF_COMMENT',"Komentarze");
define('INF_NO_FILE',"Nie wybrano pliku");

/*db_status.php*/
define('DB_NAME',"nazwa bazy danych");
define('DB_NUM_TABLES',"liczba tabel");
define('DB_NUM_ROWS',"liczba wierszy");
define('DB_SIZE',"rozmiar");
define('DB_DIFF',"Rozmiary mogą się różnić od rozmiarów baz danych!");
define('DB_NO_DB',"Brak dostępnej bazy danych");
define('DB_TABLES',"informacje o tabelach");
define('DB_TAB_TITLE',"tabele bazy danych");
define('DB_TAB_NAME',"nazwy tabel bazy dancyh");
define('DB_TAB_COLS',"liczba pól");

/*sql_query.php*/
define('SQ_ERROR',"Błąd wystąpił w linii");
define('SQ_SUCCESS',"Wykonano pomyslnie");
define('SQ_RESULT',"Rezultat zapytania");
define('SQ_AFFECTED',"Liczba zwróconych wierszy");
define('SQ_WARNING',"Uwaga: Ta strona służy tylko do wysyłania prostych zapytań SQL-owych. Brak ostrożności może spowodować zniszczenie bazy danych!");
define('SQ_SELECT_DB',"Wybierz bazę danych");
define('SQ_INSERT',"Wprowadź swoje zapytanie SQL tutaj");
define('SQ_FILE',"Wyslij plik SQL");
define('SQ_SEND',"Wykonaj");

/*login.php*/
define('LI_MSG',"Proszę się zalogować (użyj swojej nazwy użytkownika i hasła MySQL)");
define('LI_USER',"nazwa użytkownika");
define('LI_PASSWD',"hasło");
define('LI_LOGIN',"Login");
define('LI_LOGED_OUT',"Bezpiecznie wylogowano!");
define('LI_NOT_LOGED_OUT',"Nie wylogowano bezpiecznie!<br>Aby wylogować bezpiecznie wprowadź ZŁE hasło");

/*big_import.php*/
define('BI_IMPORTING_FILE',"Importowanie pliku");
define('BI_INTO_DB',"W Bazie danych");
define('BI_SESSION_NO',"Numer sesji");
define('BI_STARTING_LINE',"Zaczynając od linii");
define('BI_STOPPING_LINE',"Kończąc w linii");
define('BI_QUERY_NO',"Liczba wykonanych zapytań");
define('BI_BYTE_NO',"Liczba bajtów jeszcze przetwarzanych");
define('BI_DURATION',"Czas trwania ostatniej sesji");
define('BI_THIS_LAST',"obecnej sesji/razem");
define('BI_END',"Osiągnięto koniec pliku, import wydaje się być OK");
define('BI_RESTART',"Restart importu pliku");
define('BI_SCRIPT_RUNNING',"Skrypt wciąż działa!<br>Proszę poczekać dokupi koniec pliku nie zostanie osiągnięty");
define('BI_CONTINUE',"Kontunuj od linii");
define('BI_ENABLE_JS',"Włącz JavaScript aby kontynuować automatycznie");
define('BI_BROKEN_ZIP',"Plik ZIP wydaje się być uszkodzony");
define('BI_WRONG_FILE',"Stopped at line %s.<br>The current query includes more than %s dump lines. That happens if your backup file was created
by some tool which didn't place a semicolon followed by a linebreak at the end of each query, or if your backup file contains extended inserts.");
?>
