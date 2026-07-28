<?php

class matchModelDao {

    public function getStats(){
        $query = 'SELECT essysus_login,
                    SUM(CASE WHEN esmus_matchresult = "winner" THEN "1" ELSE "0" END)as won,
                    SUM(CASE WHEN esmus_matchresult = "loser"  THEN "1" ELSE "0" END)as lose,
                    SUM(CASE WHEN (esmus_matchresult = "loser") or (esmus_matchresult = "winner") THEN "1" ELSE "0" END)as total
                    FROM es_matchesuserstatus
                    GROUP BY essysus_login ORDER BY essysus_login';
        $result_arr = array();
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception("");
            return false;
        } else {
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                if($line['total'] != 0)
                    $line['percentage'] = number_format(($line['won']/$line['total'])*100,2);
                else
                    $line['percentage'] = 0;
                $result_arr[] = new matchStatModel($line);
            }
            if(empty ($result_arr))
                return null;
            return $result_arr;
        }
        return array();
    }


    public function checkMatchSignOutTimeOut($matchid){
        $Escore = Escore::getInstance();

        $query = 'SELECT (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now() + Interval "'.$Escore->callModule('system','getSignOutTime').'" hour)) ) THEN "1" ELSE "0" END) AS can_not_sign_out
                   FROM es_matches WHERE esmat_id = "'.$matchid.'" ';
        $canNotSignOut = DBManager::getOne($query);

        return $canNotSignOut;
    }


    public function checkMatchSignInTimeOut($matchid){
        $Escore = Escore::getInstance();
        $query = 'SELECT (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now() + Interval "'.$Escore->callModule('system','getSignUpTime').'" hour)) ) THEN "1" ELSE "0" END) AS can_not_sign_in
                   FROM es_matches WHERE esmat_id = "'.$matchid.'" ';
        $canNotSignIn = DBManager::getOne($query);
        
        return $canNotSignIn;
    }

    public function saveSummary($summary){
        DBManager::Transaction('BEGIN');

        $query = 'UPDATE es_matchesuserstatus SET esmus_matchresult = null WHERE esmat_id = "'.$summary->get('esmat_id').'"';
        DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");

        $query = 'UPDATE es_matches SET esmat_team1points = "'.$summary->get('wonsets_A').'",
                                        esmat_team2points = "'.$summary->get('wonsets_B').'"
                                        WHERE esmat_id = "'.$summary->get('esmat_id').'"';
        DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");
        $query = 'DELETE FROM es_matchteam WHERE esmat_id = "'.$summary->get('esmat_id').'"';
        DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");
        foreach($summary->get('team1') as $key => $value )
        {
            $esmt_id = DBManager::generateId('es_matchteam', 'esmt_id');
            $query = 'INSERT INTO es_matchteam(esmt_id, esmt_team, essysus_login, esmat_id)
                    VALUES("'.$esmt_id.'", "0", "'.$value.'", "'.$summary->get('esmat_id').'" )
                 ';
            DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");
            if($summary->get('wonsets_A')>$summary->get('wonsets_B')){
                $query = 'UPDATE es_matchesuserstatus SET esmus_matchresult = "winner"
                    WHERE esmat_id = "'.$summary->get('esmat_id').'" AND essysus_login = "'.$value.'" ';
            }
            else if($summary->get('wonsets_A')<$summary->get('wonsets_B')){
                $query = 'UPDATE es_matchesuserstatus SET esmus_matchresult = "loser"
                    WHERE esmat_id = "'.$summary->get('esmat_id').'" AND essysus_login = "'.$value.'" ';
            }
            else{
                $query = 'UPDATE es_matchesuserstatus SET esmus_matchresult = null
                    WHERE esmat_id = "'.$summary->get('esmat_id').'" AND essysus_login = "'.$value.'" ';
            }
            DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");
        }
        foreach($summary->get('team2') as $key => $value )
        {
            $esmt_id = DBManager::generateId('es_matchteam', 'esmt_id');
            $query = 'INSERT INTO es_matchteam(esmt_id, esmt_team, essysus_login, esmat_id)
                    VALUES("'.$esmt_id.'", "1", "'.$value.'", "'.$summary->get('esmat_id').'" )
                 ';
            DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");
            if($summary->get('wonsets_B')>$summary->get('wonsets_A')){
                $query = 'UPDATE es_matchesuserstatus SET esmus_matchresult = "winner"
                    WHERE esmat_id = "'.$summary->get('esmat_id').'" AND essysus_login = "'.$value.'" ';
            }
            else if($summary->get('wonsets_B')<$summary->get('wonsets_A')){
                $query = 'UPDATE es_matchesuserstatus SET esmus_matchresult = "loser"
                    WHERE esmat_id = "'.$summary->get('esmat_id').'" AND essysus_login = "'.$value.'" ';
            }
            else{
                $query = 'UPDATE es_matchesuserstatus SET esmus_matchresult = null
                    WHERE esmat_id = "'.$summary->get('esmat_id').'" AND essysus_login = "'.$value.'" ';
            }
            DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");
        }
        DBManager::Transaction('COMMIT');
        return true;
    }

    public function getMatchSummaryById($id){
        $query = 'SELECT esmt_team, essysus_login FROM es_matchteam WHERE esmat_id ="'.$id.'" ';
        $result_arr = array();
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception("");
            return false;
        } else {
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $result_arr[] = new matchSummaryModel($line);
            }
            if(empty ($result_arr))
                return null;
            return $result_arr;
        }
        return array();
    }

    public function getCommingMatch(){
        $Escore = Escore::getInstance();
        $query = 'SELECT
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now() + Interval "'.$Escore->callModule('system','getSignOutTime').'" hour)) ) THEN "1" ELSE "0" END) as esmat_locked,
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now() + Interval "'.$Escore->callModule('system','getSignUpTime').'" hour)) ) THEN "1" ELSE "0" END) as esmat_fulllocked,
                    m.esmat_id, esmat_matchdate, esmat_matchbegintime, esmat_matchendtime, esmat_slots, esmat_comment,
                    (SELECT count(mus.esmat_id) FROM es_matchesuserstatus as mus WHERE mus.esmat_id = m.esmat_id AND essysus_login = "' . $_SESSION['admin']['essysus_login'] . '") AS esmat_matchstatus,
                    (SELECT count(mus.esmat_id) FROM es_matchesuserstatus as mus WHERE mus.esmat_id = m.esmat_id) AS esmat_usedslots
                    FROM es_matches as m WHERE esmat_matchdate > Date(now()) OR ( (esmat_matchdate = Date(now()))  AND (esmat_matchbegintime > Time(Now()))) ORDER BY esmat_matchdate LIMIT 0,1';
        if (DB::isError($result = DBManager::getRow($query, array(), DB_FETCHMODE_ASSOC))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
        }
        return $result;
    }

    public function getUsers(){
        $query = 'SELECT essysus_login FROM es_sysusers WHERE essysus_active = "1" AND esurole_id = "ZAWODNIK"';
        $result_arr = array();
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception("");
            return false;
        } else {
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $result_arr[] = new matchModel($line);
            }
            return $result_arr;
        }
    }

    public function yourVote($id) {
        $query = 'SELECT esrat_rate FROM es_matchrates WHERE esmat_id = "' . $id . '" and esrat_login = "' . $_SESSION['admin']['essysus_login'] . '" ';
        $yourVote = DBManager::getOne($query);

        return $yourVote;
    }

    public function vote($esmat_id) {
        $id = explode('_', $esmat_id);

        DBManager::Transaction('BEGIN');
        $esratid = DBManager::generateId('es_matchrates', 'esrat_id');

        $query = 'INSERT INTO es_matchrates(esrat_id, esmat_id, esrat_usrlogin, esrat_rate)
                        VALUES("' . $esratid . '", "' . $id[0] . '", "' . $_SESSION['admin']['essysus_login'] . '", "' . $id[1] . '") ';

        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
        }
        DBManager::Transaction('COMMIT');
        return true;
    }

    //uwaga kopia tej funkcji jest w module users
    public function signOut($id, $login) {
        $Escore = Escore::getInstance();
        DBManager::Transaction('BEGIN');

        $query = 'DELETE FROM es_matchesuserstatus WHERE essysus_login = "' . $login . '" AND esmat_id = "' . $id . '" ';
        DB::isError(DBManager::Exec($query, "TRANSACTION_OFF"));
        $message = "wrong answer";
        echo "<script type='text/javascript'>alert('$message');</script>";
        
        
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

            $result = $swift->batchSend($message, $recipients, new Swift_Address($Escore->callModule('system','getSenderEmail'), "Siatkówka"));*/
        }
        DBManager::Transaction('COMMIT');
        return true;
    }

    //uwaga kopia tej funkcji jest w module users
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

    public function deleteMatch($id) {
        $query1 = 'DELETE FROM es_matchesuserstatus WHERE esmat_id = "' . $id . '"';
        $query2 = 'DELETE FROM es_matches WHERE esmat_id = "' . $id . '"';
        $query3 = 'DELETE FROM es_matchrates WHERE esmat_id = "'.$id.'"';
        $query4 = 'DELETE FROM es_matchteam WHERE esmat_id ="'.$id.'"';

        DBManager::Transaction('BEGIN');
        DB::isError(DBManager::Exec($query1, "TRANSACTION_OFF"));
        DB::isError(DBManager::Exec($query2, "TRANSACTION_OFF"));
        DB::isError(DBManager::Exec($query3, "TRANSACTION_OFF"));
        DB::isError(DBManager::Exec($query4, "TRANSACTION_OFF"));
        DBManager::Transaction('COMMIT');

        return true;
    }

    public function getNotSignedUpUsers($id) {
        $query = 'SELECT essysus_login FROM es_matchesuserstatus WHERE esmat_id = "' . $id . '" order by esmus_signupdatetime';
        $temp_result = array();

        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception("");
            return false;
        } else {
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $temp_result[] = $line['essysus_login'];
            }
        }
        $k = 0;
        $vars = '';
        foreach ($temp_result as $login) {
            if ($k == 0)
                $vars = ' essysus_login <> "' . $login . '"';
            else
                $vars .=' AND essysus_login <> "' . $login . '"';
            $k++;
        }

        $query = 'SELECT essysus_login, esurole_id, essysus_autosignup FROM es_sysusers WHERE ';
        if($vars != '')
           $query .= ' ( ' . $vars . ') AND';
        $query .= ' esurole_id = "ZAWODNIK" ';
        $result_arr = array();
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception("");
            return false;
        } else {
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $result_arr[] = new matchModel($line);
            }
            return $result_arr;
        }
        return array();
    }

    public function getMatchUsers($id, $limit = false) {
        //1st team win = 0 2nd team won 1;

        if($limit)
        {
            $query = 'SELECT esmat_slots FROM es_matches WHERE esmat_id = "' . $id . '"';
            $slots = DBManager::getOne($query);
        }
        
        $query = '
            (SELECT 1 as essysus_signedup,
            es_sysusers.essysus_login, esmus_matchresult, esurole_id, essysus_autosignup, esmus_status  FROM es_sysusers JOIN es_matchesuserstatus
            ON es_sysusers.essysus_login =  es_matchesuserstatus.essysus_login
            WHERE essysus_active = "1" and esmat_id = "' . $id . '") ';

        if($limit)
            $query .= 'LIMIT 0, '.$slots.' ';
        $result_arr = array();
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception("");
            return false;
        } else {
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $result_arr[] = new matchModel($line);
            }
            return $result_arr;
        }
    }

    public function getMatchById($id) {
        $Escore = Escore::getInstance();
        $query = 'SELECT 
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now()+Interval "'.$Escore->callModule('system','getSignOutTime').'" hour)) ) THEN "1" ELSE "0" END) as esmat_locked,
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now() + Interval "'.$Escore->callModule('system','getSignUpTime').'" hour )) ) THEN "1" ELSE "0" END) as esmat_fulllocked,
                    esmat_id, esmat_team1points, esmat_team2points, esmat_matchdate, esmat_matchbegintime, esmat_matchendtime, esmat_slots, esmat_comment,
                    (SELECT count(mus.esmat_id) FROM es_matchesuserstatus as mus WHERE mus.esmat_id = "'.$id.'" AND essysus_login = "' . $_SESSION['admin']['essysus_login'] . '") AS issignedup
                    FROM es_matches WHERE esmat_id = "' . $id . '"';

        if (DB::isError($result = DBManager::getRow($query, array(), DB_FETCHMODE_ASSOC))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
        }
        return $result;
    }

    public function saveMatch($array) {
        DBManager::Transaction('BEGIN');
        for ($i = 0; $i <= (int) $array['cycles']; $i++) {
            $matchid = DBManager::generateId('es_matches', 'esmat_id');
            $query = 'INSERT INTO es_matches(
                                             esmat_id,
                                             esmat_matchdate,
                                             esmat_matchbegintime,
                                             esmat_matchendtime,
                                             esmat_slots,
                                             esmat_comment
                                             )
                                      values(
                                             "' . $matchid . '",';
            if ($i > 0) {
                $query .= ' DATE_ADD("' . $array['date'] . '", INTERVAL ' . (int) (7 * $i) . ' DAY),';
            } else {
                $query .= '"' . $array['date'] . '",';
            }
            $query .='"' . $array['start_time'] . '",
                                             "' . $array['end_time'] . '",
                                             "' . $array['slots'] . '",';
            if ($array['comment'] == '')
                $query .='null ';
            else
                $query .='"' . $array['comment'] . '"';
            $query .=')';
            
            DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");

            $usersToSignUp = $array['signedup_users'];

            foreach ($usersToSignUp as $key => $value) {
                $query = 'INSERT INTO es_matchesuserstatus(esmat_id, essysus_login, esmus_status)
                            VALUES("' . $matchid . '", "' . $value . '", "1")';
                DB::isError(DBManager::Exec($query), "TRANSACTION_OFF");
            }
        }
        DBManager::Transaction('COMMIT');

        return true;
    }

    private function getAutoSignUpUsersIds() {
        $query = 'SELECT essysus_login FROM es_sysusers  WHERE essysus_autosignup = "1"';
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
        } else {
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $result_arr[] = $line['essysus_login'];
            }
            return $result_arr;
        }
    }

    public function getMatches($l1, $l2) {
       $Escore = Escore::getInstance();
        $query = 'SELECT SQL_CALC_FOUND_ROWS *,
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now() + Interval "'.$Escore->callModule('system','getSignOutTime').'" hour )) ) THEN "1" ELSE "0" END) as esmat_locked,
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now() + Interval "'.$Escore->callModule('system','getSignUpTime').'" hour )) ) THEN "1" ELSE "0" END) as esmat_fulllocked,
                    (SELECT count(escom_id)as counter FROM es_comment wHERE es_comment.esmat_id = m.esmat_id ) as esmat_commentsnumber,
                    (SELECT SUM(esrat_rate) FROM es_matchrates WHERE es_matchrates.esmat_id = m.esmat_id)/(SELECT count(esrat_id) FROM es_matchrates WHERE es_matchrates.esmat_id = m.esmat_id)as esmat_rate,
                    (SELECT esrat_rate FROM es_matchrates WHERE es_matchrates.esmat_id = m.esmat_id and es_matchrates.esrat_usrlogin = "' . $_SESSION['admin']['essysus_login'] . '") as esmat_yourrate,
                    (SELECT count(mus.esmat_id) FROM es_matchesuserstatus as mus WHERE mus.esmat_id = m.esmat_id AND essysus_login = "' . $_SESSION['admin']['essysus_login'] . '") AS esmat_matchstatus,
                    (SELECT count(mus.esmat_id) FROM es_matchesuserstatus as mus WHERE mus.esmat_id = m.esmat_id) AS esmat_usedslots,
                    m.esmat_id, esmat_createdate, esmat_matchdate, esmat_matchbegintime, esmat_matchendtime, esmat_slots, esmat_comment FROM es_matches as m ORDER BY esmat_matchdate desc LIMIT ' . $l1 . ',' . $l2 . '';
        DBManager::Transaction('BEGIN');
        $result_arr = array();
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
        } else {
            $query_calc = 'SELECT FOUND_ROWS();';
            $result_arr['num_rows'] = DBManager::getOne($query_calc);
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $result_arr['items'][] = new matchModel($line);
            }
            DBManager::Transaction('COMMIT');
            return $result_arr;
        }
    }

	public function setComment($id, $string){
		DBManager::Transaction('BEGIN');		
		$query = 'SELECT esmat_id, esmat_comment FROM es_matches WHERE esmat_id = "'.$id.'"';	
		if(DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
         throw new Exception();
         return false;
		}else{
			$line = $result->fetchRow(DB_FETCHMODE_ASSOC);		
			if(is_null($line['esmat_comment'])) {
				$comment = '<p class="shoutbox">'.$string.'</p>';
			} else {
				$comment = '<p class="shoutbox">'.$string.'</p>'.base64_decode($line['esmat_comment']);
			}
			$comment = base64_encode($comment);
			$query = 'UPDATE es_matches SET esmat_comment = "'.$comment.'" WHERE esmat_id ="'.$id.'"';	
			if(DB::isError($result = DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
			}else {
				DBManager::Transaction('COMMIT');
				return true;			
			}
		}
	}

}

?>
