<?php

class usersModelDao {

    //signOut, signIn Skopiowane z modulu matchmodeldao rozwiązać inaczej jak będzie kiedyś czas tutaj się spieszyło.
    public function signOut($id, $login) {
        DBManager::Transaction('BEGIN');

        $query = 'DELETE FROM es_matchesuserstatus WHERE essysus_login = "' . $login . '" AND esmat_id = "' . $id . '" ';
        DB::isError(DBManager::Exec($query, "TRANSACTION_OFF"));

        $query = 'SELECT count(esmat_id) FROM es_matchesuserstatus WHERE esmat_id = "' . $id . '" ';

        $numberOfSidnedInPlayers = DBManager::getOne($query);
        if ($numberOfSidnedInPlayers > 11) {

            $query = 'SELECT esmat_slots FROM es_matches where esmat_id = "' . $id . '" ';
            $slots = (int) DBManager::getOne($query) - 1;

            $query = 'SELECT m.esmat_id, sus.essysus_login, esmat_matchdate, esmat_matchbegintime , esmat_matchendtime  FROM es_matches as m JOIN es_matchesuserstatus as mus ON m.esmat_id = mus.esmat_id JOIN es_sysusers as sus ON mus.essysus_login = sus.essysus_login
                WHERE m.esmat_id = "' . $id . '" ORDER BY esmus_signupdatetime LIMIT ' . $slots . ', 1';

            $match = array();
            if (DB::isError($match = DBManager::getRow($query, array(), DB_FETCHMODE_ASSOC))) {
                DBManager::Transaction('ROLLBACK');
                throw new Exception();
                return false;
            }

           /* $query = 'SELECT DECODE(essysus_email,"escore") AS essysus_email FROM es_sysusers WHERE essysus_login="' . $match['essysus_login'] . '";';
            $email = DBManager::getOne($query);

            require_once "lib/Swift.php";
            require_once "lib/Swift/Connection/SMTP.php";
            require_once "lib/Swift/Plugin/VerboseSending.php";
            require_once "lib/Swift/Plugin/Decorator.php";
            require_once "lib/Swift/Connection/NativeMail.php";

            $content = "Witaj " . $match['essysus_login'] . ",<br /> Właśnie zwolniło się miejsce na mecz w dniu: " . $match['esmat_matchdate'] . " w godzinach: " . date('H:i', strtotime($match['esmat_matchbegintime'])) . " - " . date('H:i', strtotime($match['esmat_matchendtime'])) . ".<br /> Twój obecny status to: Zerejestrowany!<br/ > Jeżeli nie dasz rady się pojawić na meczu zaloguj sie na swoje konto i kliknij wyrejestruj.";

            $message = & new Swift_Message("Zwolniło się miejsce na mecz.");
            $smtp = & new Swift_Connection_SMTP("escobb.com.pl", 25);
            $swift = & new Swift($smtp);

            $body = & new Swift_Message_Part($content, "text/html");


            $content2 = iconv('UTF-8', 'ISO-8859-2', $content);

            $body = new Swift_Message_Part($content2, "text/html");
            $body->setCharset("iso-8859-2");
            $body->setEncoding("iso-8859-2");


            $message->attach($body);


            $recipients = & new Swift_RecipientList();

            $recipients->addTo($email);

            $result = $swift->batchSend($message, $recipients, new Swift_Address(EMAIL_FROM_DEFINE, "Siatkówka"));*/
        }
        DBManager::Transaction('COMMIT');
        return true;
    }

    public function signIn($id, $login) {

        $query = 'SELECT count(essysus_login) FROM es_matchesuserstatus WHERE esmat_id = "' . $id . '" and essysus_login = "' . $login . '" ';
        $val = DBManager::getOne($query);

        //nie rejestruj jeżeli przypadkiem już jest zarejestrowany
        if ($val > 0)
            return false;

        $query = 'INSERT INTO es_matchesuserstatus(esmat_id, essysus_login, esmus_status)
                    VALUES("' . $id . '", "' . $login . '", "1")';
        DB::isError(DBManager::Exec($query));
        return true;
    }

	//autroyzacja, admin + public ------------------------------------------------------------
    
    function autorizeInDB($login,$password) {
    	DBManager::Transaction('BEGIN');
    	//czy istnieje konto uzytkownika i czy jest aktywne i nie zablokowane
    	$query = 'SELECT * FROM es_sysusers WHERE essysus_login= "'.trim($login).'" AND essysus_active="1";';
    	if(DB::isError($result = DBManager::Query($query))){
    		DBManager::Transaction('ROLLBACK');
    		throw new Exception();
    	} else {	
	    	// if bierze pierwszy wiersz tylko
	    	if($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
	    		if($line['essysus_passwd'] === md5(htmlspecialchars($password))){
	    			DBManager::Transaction('COMMIT');
	    			return TRUE;
	    		}
	    	}
   	    	DBManager::Transaction('ROLLBACK');
    	  	return FALSE;	    	
    	}
    }
   
    //pobierz usera, admin + public, okroic zapytanie ---------------------------------------------
   
    public function getUserByLogin($login){
	  	DBManager::Transaction('BEGIN');
	  	$query = 'SELECT * FROM es_sysusers WHERE essysus_login="'.trim($login).'";';
	  	if(DB::isError($result = DBManager::Query($query))){
	  		DBManager::Transaction('ROLLBACK');
    		throw new Exception();
	  	} else {
		  	if($line = $result->fetchRow(DB_FETCHMODE_ASSOC)){
		  		$currentUser = new usersModel($line);
		  		DBManager::Transaction('COMMIT');
		  		return $currentUser;	  		   	
		  	}
		  	throw new Exception();
		  	DBManager::Transaction('ROLLBACK');		  		
	  	}
    }
	   	
	//ustaw lastlogin i counter -----------------------------------------------------------
	
	public function updateUserVars($login){
		$query_upd = 'UPDATE es_sysusers SET essysus_lastlogin="'.mktime().'",essysus_counter=(essysus_counter+1) WHERE essysus_login="'.trim($login).'"';
		DBManager::Transaction('BEGIN');
		if(DB::isError(DBManager::Query($query_upd))){
				throw new Exception();
				DBManager::Transaction('ROLLBACK');
		}
		else {
			DBManager::Transaction('COMMIT');
		}
	}

}
?>
