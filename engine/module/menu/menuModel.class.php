<?php

class menuModel {

	public $_children = array();
	
	public function __construct($data_array = NULL) {
    	if (!$data_array) return;
    		foreach ($data_array as $key => $value)
    			$this->$key = $value;
    }
    
    public function get($key){
    	return $this->$key;
    }
    
    public function set($key,$value){
    	$this->$key = $value;
    }

    // bylo category
	public function getChildren(){
		return $this->_children;
	} 
    
    public function setChildren($array){
    	if (!$array) return;
    	$this->_children = $array;
    }
    public function withoutHTML($key){
      return strip_tags($this->getHTML($key));
    }
    public function gethtml($key){
    	$trans_tbl = get_html_translation_table(HTML_ENTITIES);
		$trans_tbl = array_flip($trans_tbl);
		return strtr ($this->$key ,$trans_tbl);
    }
   	public function hasChildren(){
    	if(empty($this->_children)) return FALSE;
    	else return TRUE; 
    }

    public function getTitles(){
    	if(!isset($this->escat_title)) return;
    	return explode('|',$this->escat_title);    	
    }
         
  }
  
?>