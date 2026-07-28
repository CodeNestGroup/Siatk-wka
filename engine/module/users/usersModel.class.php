<?php

class usersModel extends object{
	
    public function gethtml($key){
    	$trans_tbl = get_html_translation_table(HTML_ENTITIES);
		$trans_tbl = array_flip($trans_tbl);
		return strtr ($this->$key ,$trans_tbl);
    }

	// convert timestamp to date
	function convertToDate($key, $format = NULL){
		if(!is_numeric($this->$key)) return;
		if($format == 'public')
			return date("Y-m-d, H:i",$this->$key);
		else
			return date("Y-m-d",$this->$key);
   } 
}

// role userow, do rozwiniecia 
class usersRoleModel extends object{}

?>

