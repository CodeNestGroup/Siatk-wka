<?php

class DBManager{
	private static $DBConnection = NULL;
	private static $queryCounter;
	
	private function __construct()	{}
	
	// inicjalizacja polaczenia z baza danych
	public function init(){
		$dsn = DB_PHPTYPE.'://'.DB_USERNAME.':'.DB_PASSWORD.'@'.DB_PROTOCOL.'+'.DB_HOST.'/'.DB_NAME;
		if(PEAR::isError(self::$DBConnection = DB::connect($dsn)))
				throw new Exception(self::$DBConnection->getMessage().self::$DBConnection->getCode());
		//self::$DBConnection->Query('SET CHARACTER SET utf8; SET NAMES utf8;');	
	}
	
	//pobiera ilosc zapytan
	public function getQueryCounter(){
		return self::$queryCounter;
	}	
	
	 //zapytanie do bazy danych
	 public function Query($querystring){
		self::$queryCounter++;
	 	if(self::$DBConnection){
			if(DB::isError($result = self::$DBConnection->Query($querystring)))
					throw new Exception($result->getMessage().$result->getCode());
			return $result;
		}
	}
	
	 // pobranie jednej wartosci
	 public function getOne($querystring){
		self::$queryCounter++;
	 	if(self::$DBConnection){
			if(DB::isError($result = self::$DBConnection->getOne($querystring)))
					throw new Exception($result->getMessage().$result->getCode());
			return $result;
		}
	}

	 // pobranie wiersza - z fetchmode...
	 public function getRow($querystring,$param,$fetchmode){
		self::$queryCounter++;
	 	if(self::$DBConnection){
			if(DB::isError($result = self::$DBConnection->getRow($querystring,$param,$fetchmode)))
					throw new Exception($result->getMessage().$result->getCode());
			return $result;
		}
	}

	 // pobranie kolumny
	 public function getCol($querystring){
		self::$queryCounter++;
	 	if(self::$DBConnection){
			if(DB::isError($result = self::$DBConnection->getCol($querystring)))
					throw new Exception($result->getMessage().$result->getCode());
			return $result;
		}
	}

	// ilosc wierszy
	public function numRows($result){
		if(self::$DBConnection){
			if(DB::isError($numrows = $result->numRows()))
					throw new Exception($result->getMessage().$result->getCode());
			return $numrows;
		}
	}


	public function Transaction($type){
		if(DB::isError($result = self::$DBConnection->Query($type))){
				throw new Exception($result->getMessage().$result->getCode());
		} else {
			if(self::$DBConnection->affectedRows() < 0){
					throw new Exception($result->getMessage().$result->getCode());
			}
		}
		return true;
	}

	public function AffectedRows(){
		if(DB::isError($result = self::$DBConnection->affectedRows())){
				throw new Exception($result->getMessage().$result->getCode());
		} else {
			if(self::$DBConnection->affectedRows() < 0){
					throw new Exception($result->getMessage().$result->getCode());
			}
		}
		return $result;		
	}
	
	// only for insert or update / flag to turn on/off  transaction
 	public function Exec($query,$transaction = "TRANSACTION_ON"){
		self::$queryCounter++;
 		if($transaction == "TRANSACTION_ON"){
	 		DBManager::Transaction('BEGIN');
	    	if (DB::isError($result = self::$DBConnection->Query($query))){
				DBManager::Transaction('ROLLBACK');
	    			throw new Exception($result->getMessage().$result->getCode());
	    	}
	    	else {
		    	DBManager::Transaction('COMMIT');
		    	return TRUE;
	    	}
		} elseif($transaction == "TRANSACTION_OFF") {
	    	if (DB::isError($result = self::$DBConnection->Query($query))){					    		
	    			throw new Exception($result->getMessage().$result->getCode());
	    	} else return TRUE;			  		
	
		} elseif($transaction == "TRANSACTION_ROLLBACK_ONLY") {
	    	if (DB::isError($result = self::$DBConnection->Query($query))){				
	    		DBManager::Transaction('ROLLBACK'); // add 17.08.09 ?
    			throw new Exception($result->getMessage().$result->getCode());
	    	} else return TRUE;			  		
		}
 	}
	
	public function generateId($table,$pk,$length = 5){
		while(TRUE){
			$generateid = substr(md5(uniqid(rand(),TRUE)),0,$length);
			$query = 'SELECT '.$pk.' FROM '.$table.' WHERE '.$pk.'="'.$generateid.'";';	
			if(DB::isError($result = self::$DBConnection->Query($query))){
					throw new Exception($result->getMessage().$result->getCode());
			}
			else {
				if($result->numRows() == 0) return $generateid;
				$result->free();
			}
		}
	}
	
}
?>
