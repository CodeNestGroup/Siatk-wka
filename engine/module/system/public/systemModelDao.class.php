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
        $result_arr = array();
        $query = 'SELECT essys_content FROM es_system WHERE essys_contentid = "f3" ';
    	$result = DBManager::getOne($query);
        return $result;
    }

    //-------------------------------------

    public function getSignOutTime(){
        $result_arr = array();
        $query = 'SELECT essys_content FROM es_system WHERE essys_contentid = "f4" ';
    	$result = DBManager::getOne($query);
        return $result;
    }

    public function getFields(){
    		$query = 'SELECT * FROM es_system WHERE essys_name LIKE "field%";';
			DBManager::Transaction('BEGIN');
    		if (DB::isError($result = DBManager::Query($query))){
    			throw new Exception();
				DBManager::Transaction('ROLLBACK');
    		}
    		else {			
    			$result_arr = array();
       			while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    				$result_arr[$line['essys_name']] = new systemModel($line);
    			}
    			DBManager::Transaction('COMMIT');
    			return $result_arr;
    		}    	
    }
    		
}
?>
