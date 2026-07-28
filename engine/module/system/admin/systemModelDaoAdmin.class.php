<?php

class systemModelDao {

    public function getSite_DescTitle(){
        $result_arr = array();
        $query = 'SELECT essys_content FROM es_system WHERE essys_contentid = "f1" OR essys_contentid = "f2" order by essys_contentid';
    	$result = DBManager::Query($query);
    	while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    		$result_arr[] = new systemModel($line);
    	}
    	return $result_arr;
    }

    //-------------------------------------
    
    public function getSignUpTime(){
        $query = 'SELECT essys_content FROM es_system WHERE essys_contentid = "f3" ';
    	$result = DBManager::getOne($query);
        return $result;
    }

    //-------------------------------------

    public function getSignOutTime(){
        $query = 'SELECT essys_content FROM es_system WHERE essys_contentid = "f4" ';
    	$result = DBManager::getOne($query);
        return $result;
    }

    //-------------------------------------

    public function getSenderEmail(){
        $result_arr = array();
        $query = 'SELECT essys_content FROM es_system WHERE essys_contentid = "f5" ';
    	$result = DBManager::getOne($query);
        return $result;
    }
    
    //admin + layout-------------------------------------------------------------------------------

    public function getMetatag(){
    	$result_arr = array();
    	$query = 'SELECT lang.eslg_content FROM es_system AS system ,es_lang AS lang WHERE system.essys_contentid = lang.eslg_id AND lang.eslg_symbol="'.$_SESSION['lang'].'";';
    	$result = DBManager::Query($query);
    	while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    		$result_arr[] = new systemModel($line);
    	}
    	return $result_arr;    	
    } 
	
        //preferencje jeden email ------------------------------------------------------------
	
	    public function getPreferences(){
    	// tu nie ma contentid bezposredni adres jest
    		$query = 'SELECT * FROM es_system WHERE essys_name="field1" OR essys_name="field2" OR essys_name="field3" OR essys_name="field4" OR essys_name="field5" ;';
			DBManager::Transaction('BEGIN');
    		if (DB::isError($result = DBManager::Query($query))){
    			throw new Exception();
				DBManager::Transaction('ROLLBACK');
				return FALSE;
    		}
    		else {			
    			$result_arr = array();
       			while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    				$result_arr[] = new systemModel($line);
    			}
    			DBManager::Transaction('COMMIT');
    			return $result_arr;
    		}
    	}   
    
    	//zapisz preferencje----------------------------------------------------------------
    	
    	public function savePreferences(SystemModel $pref){
                
    		$query = array();
                $query[1] = 'UPDATE es_system SET essys_content="'.htmlspecialchars($pref->get('field1')).'" WHERE essys_name="field1";';
    		$query[2] = 'UPDATE es_system SET essys_content="'.htmlspecialchars($pref->get('field2')).'" WHERE essys_name="field2";';
    		$query[3] = 'UPDATE es_system SET essys_content="'.htmlspecialchars($pref->get('field3')).'" WHERE essys_name="field3";';
                $query[4] = 'UPDATE es_system SET essys_content="'.htmlspecialchars($pref->get('field4')).'" WHERE essys_name="field4";';
                $query[5] = 'UPDATE es_system SET essys_content="'.htmlspecialchars($pref->get('field5')).'" WHERE essys_name="field5";';
    		DBManager::Transaction('BEGIN');
    		for($i=1;$i<=5;$i++){
	    		if (DB::isError($result = DBManager::Query($query[$i]))){
	    			throw new Exception();
					DBManager::Transaction('ROLLBACK');
	    		}
    		}
    		DBManager::Transaction('COMMIT');    		
    		return TRUE;
    	}

    	//-----------------------------------------------------------------------------------	
}
?>
