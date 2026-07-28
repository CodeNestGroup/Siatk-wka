<?php

class usersModelDao {


    //autroyzacja, admin + public ------------------------------------------------------------
    
    function autorizeInDB($login,$password) {
    	DBManager::Transaction('BEGIN');
    	//czy istnieje konto uzytkownika
    	$query = 'SELECT * FROM es_sysusers WHERE essysus_login="'.trim($login).'"';
    	if(DB::isError($result = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
   	  		DBManager::Transaction('ROLLBACK');
    		throw new Exception(); 		
    	} else {
    		if($result['essysus_passwd'] === md5($password)){
    			DBMAnager::Transaction('COMMIT');
    			return TRUE;
    		} else {
    			DBManager::Transaction('ROLLBACK');
    			return FALSE;
    		}    		
    	}
    }
   
    //pobierz usera, admin + public, okroic zapytanie ---------------------------------------------
    
    public function getUserByLogin($login){
    	DBManager::Transaction('BEGIN');
	  	$query = 'SELECT essysus_login,esurole_id,essysus_desc,DECODE(essysus_email,"escore") AS essysus_email, essysus_autosignup, essysus_active FROM es_sysusers WHERE essysus_login="'.trim($login).'";';
	  	if(DB::isError($result = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
	  		DBManager::Transaction('ROLLBACK');
    		throw new Exception();
	  	} else {
	  		$currentUser = new usersModel($result);
  			DBManager::Transaction('COMMIT');
  			return $currentUser;	
	  	}
    }

  	 //admin--------------------------------------------------------------------------------------
   
     public function getPassByLogin($login){
    	DBManager::Transaction('BEGIN');
	  	$query = 'SELECT essysus_passwd FROM es_sysusers WHERE essysus_login="'.trim($login).'"';
	  	if(DB::isError($result = DBManager::getOne($query))){
	   		DBManager::Transaction('ROLLBACK');
    		throw new Exception();
	  	} else {
		  	if($result != ''){
		  		DBManager::Transaction('COMMIT');
		  		return $result;
		  	} else {
		  		DBManager::Transaction('ROLLBACK');
		  		throw new Exception();	
		  	}
	  	}
    }

    //admin --------------------------------------------------------------------------------------
    
    public function updateUserPass($login,$pass){
    	$query = 'UPDATE es_sysusers SET essysus_passwd=md5("'.$pass.'") WHERE essysus_login="'.trim($login).'";';
    	DBManager::Transaction('BEGIN');
		if (DB::isError(DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
		} else {
			DBManager::Transaction('COMMIT');
			return TRUE;
		}
    }
    
    // sprawdz czy istnieje login----------------------------------------------------------
    
    public function doesUserLoginNotExist($login){
    	$query = 'SELECT count(*) FROM es_sysusers WHERE essysus_login="'.trim($login).'"';
    	DBManager::Transaction('BEGIN');
    	if (DB::isError($result = DBManager::getOne($query))){
    		DBManager::Transaction('ROLLBACK');
    		throw new Exception();
    	}
    	else{
    		if($result == 0){DBManager::Transaction('COMMIT'); return TRUE;}
    		else {DBManager::Transaction('ROLLBACK'); return FALSE;}
    	}
    }
    
    // dodaj usera------------------------------------------------------------------------
    
    public function saveUser(usersModel & $user_obj){
    // query do zapisania w tabeli essysusers   	
    $query_adduser = 'INSERT INTO es_sysusers (essysus_login,esurole_id,essysus_passwd,essysus_desc,essysus_email,essysus_createdate,essysus_lastlogin,essysus_counter, essysus_autosignup, essysus_active)
    		  VALUES (
    		  "'.htmlspecialchars(trim($user_obj->get('essysus_login'))).'",
    		  "'.$user_obj->get('esurole_id').'",
    		  MD5("'.$user_obj->get('essysus_passwd').'"),
    		  "'.htmlspecialchars($user_obj->get('essysus_desc')).'",
    		  ENCODE("'.$user_obj->get('essysus_email').'","escore"),
    		  "'.$user_obj->get('essysus_createdate').'",
    		  DEFAULT,
    		  DEFAULT,
                  "'.$user_obj->get('essysus_autosignup').'",
    		  "'.$user_obj->get('essysus_active').'")';
    
	    DBManager::Transaction('BEGIN');
	    if (DB::isError(DBManager::Query($query_adduser))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
		} else {
			DBManager::Transaction('COMMIT');
			return TRUE;
	    }
    }
    
    // pobierz jednego badz wszytkich userow----------------------------------------------
    
    public function getOneOrAllUsers($id = NULL){
    	if(isset($id))
    		$query_getuser = 'SELECT essysus_login,(SELECT esurole_name FROM es_user_role WHERE es_user_role.esurole_id=es_sysusers.esurole_id) AS esurole_name,essysus_desc,DECODE(essysus_email,"escore") AS essysus_email,essysus_createdate,essysus_lastlogin,essysus_counter,essysus_active FROM es_sysusers WHERE essysus_login="'.trim($id).'" ORDER BY esurole_name ASC';
        else
	    	$query_getuser = 'SELECT essysus_login,(SELECT esurole_name FROM es_user_role WHERE es_user_role.esurole_id=es_sysusers.esurole_id) AS esurole_name,essysus_desc,DECODE(essysus_email,"escore") AS essysus_email,essysus_createdate,essysus_lastlogin,essysus_counter,essysus_active FROM es_sysusers ORDER BY esurole_name ASC';
    	DBManager::Transaction('BEGIN');
    		if (DB::isError($result = DBManager::Query($query_getuser))){
				DBManager::Transaction('ROLLBACK');
    			throw new Exception();
    		}
    		else {
    			$result_arr = array();
    			while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
	    			$result_arr[] = new usersModel($line);
    		 	}    	
    			DBManager::Transaction('COMMIT');
    			return $result_arr;
    		}
    }
    
    // update user ----------------------------------------------------------------------
    
    public function updateUser(usersModel & $user_obj){
    	// brak update'u rol
    	$query_upd = 'UPDATE es_sysusers SET 
    					esurole_id="'.$user_obj->get('esurole_id').'",
    					essysus_desc="'.htmlspecialchars($user_obj->get('essysus_desc')).'",
    					essysus_email=ENCODE("'.$user_obj->get('essysus_email').'","escore"),
                                        essysus_autosignup="'.$user_obj->get('essysus_autosignup').'",
    					essysus_active="'.$user_obj->get('essysus_active').'"
    					WHERE essysus_login="'.htmlspecialchars(trim($user_obj->get('essysus_login'))).'";';

    	DBManager::Transaction('BEGIN');
    		if (DB::isError(DBManager::Query($query_upd))){
    			DBManager::Transaction('ROLLBACK');
    			throw new Exception();
    		}				
    		else{
    			DBManager::Transaction('COMMIT');
				return TRUE;
    		}
    }
 	
 	// usun usera-------------------------------------------------------------------------
 	
 	public function deleteUser($login){
                DBManager::Transaction('BEGIN');
                $query = 'SELECT count(essysus_login) FROM es_matchesuserstatus WHERE essysus_login = "'.trim($login).'" ';
                $inMatches = DBManager::getOne($query);
                if($inMatches > 0){
                    $query = 'DELETE FROM es_matchesuserstatus WHERE essysus_login = "'.trim($login).'"';
                    DB::isError(DBManager::Exec($query, "TRANSACTION_OFF"));
                }
 		$query_del = 'DELETE FROM es_sysusers WHERE essysus_login="'.trim($login).'"';

                DB::isError(DBManager::Exec($query_del, "TRANSACTION_OFF"));
                DBManager::Transaction('COMMIT');
                return TRUE;
 	}
 	   
 	// pobierz dostepne role ------------------------------------------------------------
 	
 	public function getAllRoles(){
 		$query_get = 'SELECT * FROM es_user_role';
 		DBManager::Transaction('BEGIN');
    	if (DB::isError($result = DBManager::Query($query_get))){
    		DBManager::Transaction('ROLLBACK');
    		throw new Exception();
    	}
    	else {
    		$result_arr = array();
    		while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
	    		$result_arr[] = new usersRoleModel($line);
    	 	}    	
    		DBManager::Transaction('COMMIT');
    		return $result_arr;
    	}
 	}
 	
 	//------------------------------------------------------------------------------------
 
 	public function change_user_active($login){
		$query='UPDATE es_sysusers SET essysus_active=(CASE WHEN essysus_active<>"0" THEN "0" ELSE "1" END) WHERE essysus_login="'.trim($login).'";';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
    	} else {
			DBManager::Transaction('COMMIT');
			return TRUE;
		}						
	}
}
?>
