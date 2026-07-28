<?php

class MatchModelDao {
    
    public function getCommingMatch(){
        $Escore = Escore::getInstance();
        $query = 'SELECT
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now()+Interval "'.$Escore->callModule('system','getSignOutTime').'" hour)) ) THEN "1" ELSE "0" END) as esmat_locked,
                                        (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now())) ) THEN "1" ELSE "0" END) as esmat_fulllocked,
                    m.esmat_id, esmat_matchdate, esmat_matchbegintime, esmat_matchendtime, esmat_slots, esmat_comment,
                    (SELECT count(mus.esmat_id) FROM es_matchesuserstatus as mus WHERE mus.esmat_id = m.esmat_id) AS esmat_usedslots
                    FROM es_matches as m WHERE esmat_matchdate > Date(now()) OR ( (esmat_matchdate = Date(now()))  AND (esmat_matchbegintime > Time(Now()))) ORDER BY esmat_matchdate LIMIT 0,1';
        if (DB::isError($result = DBManager::getRow($query, array(), DB_FETCHMODE_ASSOC))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
        }
        return $result;
    }

    public function getMatchById($id){
        $Escore = Escore::getInstance();
        $query = 'SELECT 
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now()+Interval "'.$Escore->callModule('system','getSignOutTime').'" hour)) ) THEN "1" ELSE "0" END) as esmat_locked,
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now())) ) THEN "1" ELSE "0" END) as esmat_fulllocked,
                    esmat_id, esmat_matchdate, esmat_matchbegintime, esmat_matchendtime, esmat_slots, esmat_comment
                    FROM es_matches WHERE esmat_id = "'.$id.'"';
        if (DB::isError($result = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
            return false;
        }
        return $result;
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
    }

    public function getMatchUsers($id) {
        $query = '
            (SELECT 1 as essysus_signedup, es_sysusers.essysus_login, esurole_id, essysus_autosignup, esmus_status  FROM es_sysusers JOIN es_matchesuserstatus
            ON es_sysusers.essysus_login =  es_matchesuserstatus.essysus_login WHERE essysus_active = "1" and esmat_id = "' . $id . '")';
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

    public function getMatches($l1, $l2) {
        $Escore = Escore::getInstance();
        $query = 'SELECT SQL_CALC_FOUND_ROWS *,
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now()+Interval "'.$Escore->callModule('system','getSignOutTime').'" hour)) ) THEN "1" ELSE "0" END)as esmat_locked,
                    (CASE WHEN (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL 0 DAY)) OR ( (esmat_matchdate < DATE_ADD(Date(now()),INTERVAL +1 DAY))  AND (esmat_matchbegintime < Time(Now())) ) THEN "1" ELSE "0" END)as esmat_fulllocked,
                    (SELECT count(escom_id)as counter FROM es_comment wHERE es_comment.esmat_id = m.esmat_id ) as esmat_commentsnumber,
                    (SELECT SUM(esrat_rate) FROM es_matchrates WHERE es_matchrates.esmat_id = m.esmat_id)/(SELECT count(esrat_id) FROM es_matchrates WHERE es_matchrates.esmat_id = m.esmat_id)as esmat_rate,
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

}

?>
