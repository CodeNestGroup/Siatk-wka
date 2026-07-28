<?php

class systemModel {

    public function __construct($data_array = NULL) {
    	if (!is_array($data_array)) return;
    		foreach ($data_array as $key => $value)
			$this->$key = $value;
    }
    
    public function get($key){
    	return $this->$key;
    }
    
    public function set($key,$value){
    	$this->$key = $value;
    }
}
?>