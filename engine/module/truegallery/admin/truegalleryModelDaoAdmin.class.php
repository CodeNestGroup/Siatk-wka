<?php
class trueGalleryModelDao {
	/* ZDJECIE */
    public function change_gimg_active($id){
		$query='UPDATE es_truegalimages SET esgimg_active=(CASE WHEN esgimg_active<>"0" THEN "0" ELSE "1" END) WHERE esgimg_id="'.$id.'";';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
    	} 
		DBManager::Transaction('COMMIT');
		return TRUE;						
	}
	
	//--------------------------------------------------------------------------------
	
	public function updateFile($file_obj){
		DBManager::Transaction('BEGIN');
		if(is_null($file_obj->get('esfile_desc'))){
			$esfile_desc = 'esfile_desc = null';
		}else{
			$esfile_desc = 'esfile_desc = "'.$file_obj->get('esfile_desc').'"';
		}
		$query = 'UPDATE es_files SET esfile_filename = "'.$file_obj->get('esfile_filename').'",
										  esfile_title = "'.htmlspecialchars(trim($file_obj->get('esfile_title'))).'",
										  esfile_position = "'.trim($file_obj->get('esfile_position')).'",
										  '.$esfile_desc.',
										  esfile_active = "'.$file_obj->get('esfile_active').'"
								WHERE esfile_id = "'.$file_obj->get('esfile_id').'"';
		if (DB::isError(DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;		
		}
		DBManager::Transaction('COMMIT');
		return true;
	}

	//--------------------------------------------------------------------------------
	
	public function updateImage($img_obj){
		DBManager::Transaction('BEGIN');
		if($img_obj->get('esgimg_filename')==null){
			$esgimg_filename = '';
		}else{
			$esgimg_filename = 'esgimg_filename = "'.$img_obj->get('esgimg_filename').'", ';
		}
		if($img_obj->get('esgimg_mfilename')=='pusty'){
			$esgimg_mfilename = '';
		}else{
			$esgimg_mfilename = 'esgimg_mfilename = "'.$img_obj->get('esgimg_mfilename').'", ';
		}
		if(is_null($img_obj->get('esgimg_desc'))){
			$esgimg_desc = 'esgimg_desc = null';
		}else{
			$esgimg_desc = 'esgimg_desc = "'.$img_obj->get('esgimg_desc').'"';
		}
		$query = 'UPDATE es_truegalimages SET '
										  .$esgimg_filename.''.$esgimg_mfilename.'
										  esgimg_position = "'.trim($img_obj->get('esgimg_position')).'",
										  '.$esgimg_desc.',
										  esgimg_active = "'.$img_obj->get('esgimg_active').'"
								WHERE esgimg_id = "'.$img_obj->get('esgimg_id').'"';
		if (DB::isError(DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;		
		}
		DBManager::Transaction('COMMIT');
		return true;
	}
		
	//------------------------------------------------------------------------------------
	
	public function deleteImage($obj){
    	$query = 'UPDATE es_truegalimages SET esgimg_filename = null WHERE esgimg_id = "'.$obj->get('esgimg_id').'"';
    	DBManager::Transaction('BEGIN');
    	if(file_exists(GALLERY_DIR.$obj->get('esgal_id').'/'.$obj->get('esgimg_filename'))){ 
	     	if (DB::isError(DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
	    	}  
	    	if(unlink(GALLERY_DIR.$obj->get('esgal_id').'/'.$obj->get('esgimg_filename'))){
	     		DBManager::Transaction('COMMIT');
	    		return true;   		
	    	}else{
	    		DBManager::Transaction('ROLLBACK');
	    		return false;
	    	}
    	}
    	return false;    	
    }	
	
	//-----------------------------------------------------------------------------------

	public function delImage($id){
		DBManager::Transaction('BEGIN');
		$query = 'SELECT esgimg_filename, esgimg_mfilename, esgal_id FROM es_truegalimages WHERE esgimg_id = "'.$id.'"';
		if (DB::isError($result = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
				return false;
		}	
		$query = 'DELETE FROM es_truegalimages WHERE esgimg_id = "'.$id.'"';
		if (DB::isError(DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;		
		}
		DBManager::Transaction('COMMIT');
		return new trueGalImagesModel($result);
	}	
	
	//---------------------------------------------------------------------------------
	
	public function delFile($id){
		DBManager::Transaction('BEGIN');
		$query = 'SELECT esfile_filename, esgal_id FROM es_files WHERE esfile_id = "'.$id.'"';
		if (DB::isError($result = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
				return false;
		}	
		$query = 'DELETE FROM es_files WHERE esfile_id = "'.$id.'"';
		if (DB::isError(DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;		
		}
		DBManager::Transaction('COMMIT');
		return new galFilesModel($result);
	}	
	
	//---------------------------------------------------------------------------------
	
	public function getImageById($id){
		$result_arr = array();
		$query = 'SELECT * FROM es_truegalimages WHERE esgimg_id = "'.$id.'"';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;
		}else{
     		DBManager::Transaction('COMMIT');
			return new trueGalImagesModel($result);
		}
	}
	
	//-------------------------------------------------------------------------------
	
	public function getFileById($id){
		$result_arr = array();
		$query = 'SELECT * FROM es_files WHERE esfile_id = "'.$id.'"';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;
		}else{
     		DBManager::Transaction('COMMIT');
			return new galFilesModel($result);    			
		}
	}
	
	//-------------------------------------------------------------------------------
	
    public function doesGalleryHasImages($id){
    	DBManager::Transaction('BEGIN');
    	$query = 'SELECT * FROM es_truegalimages WHERE esgal_id = "'.$id.'" ';
     	if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
    	}else{
    		if(DBManager::numRows($result) > 0){
    			DBManager::Transaction('COMMIT');
    			return true;  	
    		}
    	}
    	DBManager::Transaction('COMMIT');
    	return false;
    }
	
	//-------------------------------------------------------------------------------
	
	public function getCompanyNameById($id){
		DBManager::Transaction('BEGIN');
		$query = 'SELECT esgal_name
					FROM es_truegallery WHERE esgal_id = "'.$id.'"';
		if (DB::isError($esccom_name = DBManager::getOne($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;			
		}
		DBManager::Transaction('COMMIT');
		return $esccom_name;		
	}
	
	//-----------------------------------------------------------------------------
	
	public function getGalleryNameById($id){
		DBManager::Transaction('BEGIN');
		$query = 'SELECT esgal_name
					FROM es_truegallery WHERE esgal_id = "'.$id.'"';
		if (DB::isError($esgal_name = DBManager::getOne($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;			
		}
		DBManager::Transaction('COMMIT');
		return $esgal_name;		
	}
	
	//----------------------------------------------------------------------------
	
	public function saveFile($obj){
		if(is_null($obj->get('esfile_desc'))){
			$esfile_desc = 'null';
		}else{
			$esfile_desc = '"'.$obj->get('esfile_desc').'"';
		}
		DBManager::Transaction('BEGIN');
		$query = 'INSERT INTO es_files(esfile_id, esfile_title, esgal_id, esfile_filename, esfile_desc, esfile_position, esfile_active)
					VALUES("'.$obj->get('esfile_id').'",
						   "'.htmlspecialchars(trim($obj->get('esfile_title'))).'",
						   "'.$obj->get('esgal_id').'",
						   "'.$obj->get('esfile_filename').'",
						   '.$esfile_desc.',
						   "'.$obj->get('esfile_position').'",
						   "'.$obj->get('esfile_active').'"
					)';
		if (DB::isError(DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
				return false;
		}		
		DBManager::Transaction('COMMIT');
		return true;		
	}		
	
	//----------------------------------------------------------------------------
	
	public function saveImg($obj){
		if(is_null($obj->get('esgimg_filename'))){
			$esgimg_filename = 'null';
		}else{
			$esgimg_filename = '"'.$obj->get('esgimg_filename').'"';
		}
		if(is_null($obj->get('esgimg_desc'))){
			$esgimg_desc = 'null';
		}else{
			$esgimg_desc = '"'.$obj->get('esgimg_desc').'"';
		}
		DBManager::Transaction('BEGIN');
		$query = 'INSERT INTO es_truegalimages(esgimg_id, esgal_id, esgimg_position, esgimg_filename, esgimg_mfilename, esgimg_desc, esgimg_active)
					VALUES("'.$obj->get('esgimg_id').'",
					       "'.$obj->get('esgal_id').'",
					       "'.trim($obj->get('esgimg_position')).'",
					       '.$esgimg_filename.',
					       "'.$obj->get('esgimg_mfilename').'",
					       '.$esgimg_desc.',
					       "'.$obj->get('esgimg_active').'"
					       )';
		if (DB::isError(DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
				return false;
		}		
		DBManager::Transaction('COMMIT');
		return true;
	}
	
	//----------------------------------------------------------------------------------------
	
	public function getImages($id){
		$result_arr = array();
		$query = 'SELECT * FROM es_truegalimages WHERE esgal_id = "'.$id.'" order by esgimg_adddate DESC';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;
		}else{
			while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    			$result_arr[] = new trueGalImagesModel($line);
     		}
     		DBManager::Transaction('COMMIT');
			return $result_arr;    			
		}
	}
	
	//---------------------------------------------------------------------------------------
	
	public function getFiles($id){
		$result_arr = array();
		$query = 'SELECT * FROM es_files WHERE esgal_id = "'.$id.'" ORDER BY esfile_position ';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
			return false;
		}else{
			while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    			$result_arr[] = new galFilesModel($line);
     		}
     		DBManager::Transaction('COMMIT');
			return $result_arr;    			
		}
	}

	//-----------------------------------------------------------------------------------------
	
	public function saveGallery($obj){
		DBManager::Transaction('BEGIN');
		 
		$currentdate = date('Y-m-d H:m:i');
		if(is_null($obj->get('esgal_desc'))){
			$esgal_desc = 'null';
		}else{
			$esgal_desc = '"'.htmlspecialchars($obj->get('esgal_desc')).'"';
		}
		$query = 'INSERT INTO es_truegallery(esgal_id, esgal_name, esgal_desc,
					esgal_createdate, esgal_modifydate, esgal_position, esgal_active)
						VALUES("'.$obj->get('esgal_id').'",
							   "'.trim(htmlspecialchars($obj->get('esgal_name'))).'",
							   '.$esgal_desc.',
							   "'.$currentdate.'", 
							   "'.$currentdate.'",
							   "'.$obj->get('esgal_position').'",
							   "'.$obj->get('esgal_active').'"							 
						)';
		if (DB::isError(DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception();
				return false;
		}
		DBManager::Transaction('COMMIT');
		return true;	
	}
	
	//--------------------------------------------------------------------------------------------
	
    public function & getAllCompanyAdminMode($idsec = NULL,$idcat = NULL,$orderby1 = NULL,$order1 = NULL,$limit1 = NULL){
		if($limit1) $limit =  'LIMIT '.$limit1.','.ADMIN_GAL_STEP ; else $limit =  'LIMIT 0,'.ADMIN_GAL_STEP;
		$query = 'SELECT SQL_CALC_FOUND_ROWS *,esgal_name,
					(SELECT count(esgal_id) FROM es_truegalimages WHERE es_truegalimages.esgal_id = es_truegallery.esgal_id GROUP BY esgal_id )AS number_of_images
					FROM es_truegallery ORDER BY esgal_position '.$limit.';';
		DBManager::Transaction('BEGIN');
    	if (DB::isError($result = DBManager::Query($query))){
    		DBManager::Transaction('ROLLBACK');
    		throw new Exception('Pobranie danych artykułów nie powiodło się.');
    	}
    	else {
    		$result_arr = array();
    		$query_calc = 'SELECT FOUND_ROWS();';
    		$result_arr['num_rows'] = DBManager::getOne($query_calc);
    		while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
	    		$result_arr['items'][] = new articlesModel($line);
    	 	} 
    	DBManager::Transaction('COMMIT');
    	return $result_arr;
    	}
    }
    
    //----------------------------------------------------------------------------------------------
    
	public function & getGalleryAdminMode($idart,$lg = DEFAULT_LANG){
    	$query = 'SELECT gallery.esgal_id, gallery.esgal_name, gallery.esgal_desc, gallery.esgal_position, gallery.esgal_active
				FROM es_truegallery AS gallery WHERE gallery.esgal_id="'.$idart.'";';
			DBManager::Transaction('BEGIN');
    		if (DB::isError($result = DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
    			throw new Exception('Pobranie danych artykułów nie powiodło się.');
    		}
    		else {
    			$result_arr = array();
    			$i = 0;
    			while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
	    			$result_arr[] = new articlesModel($line);
	    			// musi zwrocic tylko jeden wiersz
	    			if($i++ > 1) throw new Exception('Błąd. Zwrócono więcej niż jeden wiersz.');
    		 	}    	
    		DBManager::Transaction('COMMIT');
    		return $result_arr;
    		}
    }
    
    //----------------------------------------------------------------------------------------------

    public function updateGallery($obj){        
		$lang = "pl";
		$escat_id = $obj->get('escat_id');
    	if(is_null($obj->get('esgal_desc'))){
			$esgal_desc = 'null';
		}else{
			$esgal_desc = '"'.htmlspecialchars($obj->get('esgal_desc')).'"';
		}
		DBManager::Transaction('BEGIN');	
		$currentdate = date('Y-m-d H:m:i');	
		$query = 'UPDATE es_truegallery SET
					esgal_name = "'.trim(htmlspecialchars($obj->get('esgal_name'))).'",
					esgal_desc = '.$esgal_desc.',
					esgal_position = "'.trim($obj->get('esgal_position')).'",
                                        esgal_active = "'.$obj->get('esgal_active').'",
                                        esgal_modifydate = "'.$currentdate.'"
					WHERE esgal_id = "'.$obj->get('esgal_id').'";';
		if (DB::isError(DBManager::Query($query))){
				DBManager::Transaction('ROLLBACK');
				throw new Exception('error');
				return false;
		}
		DBManager::Transaction('COMMIT');
		return true;		
	}
	
	//------------------------------------------------------------------------------------------------
	
    public function deleteGallery($id){
    	DBManager::Transaction('BEGIN');
    	$query = 'SELECT esgal_id FROM es_truegallery WHERE esgal_id = "'.$id.'"';
        if (DB::isError($es_truegallery = DBManager::getRow($query,array(),DB_FETCHMODE_ASSOC))){
    		DBManager::Transaction('ROLLBACK');
    		throw new Exception();
    	}   	    	
    	$query = 'DELETE FROM es_truegallery WHERE esgal_id = "'.$id.'"';
     	if (DB::isError(DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
    	}   
    	DBManager::Transaction('COMMIT');
    	return $es_truegallery;
    }
    
    //-----------------------------------------------------------------------------------------------------
    
    public function change_gal_active($idcat){
		$query='UPDATE es_truegallery SET esgal_active=(CASE WHEN esgal_active<>"0" THEN "0" ELSE "1" END) WHERE esgal_id="'.$idcat.'";';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
    	}
		DBManager::Transaction('COMMIT');
		return TRUE;						
	}

	//------------------------------------------------------------------------------------------------------
	
    public function change_gal_priority($idcat){
		$query='UPDATE es_truegallery SET esgal_priorityflag=(CASE WHEN esgal_priorityflag<>"0" THEN "0" ELSE "1" END) WHERE esgal_id="'.$idcat.'";';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
    	}
		DBManager::Transaction('COMMIT');
		return TRUE;						
	}
	
	//------------------------------------------------------------------------------------------------------
	
    public function change_file_active($idcat){
		$query='UPDATE es_files SET esfile_active=(CASE WHEN esfile_active<>"0" THEN "0" ELSE "1" END) WHERE esfile_id="'.$idcat.'";';
		DBManager::Transaction('BEGIN');
		if (DB::isError($result = DBManager::Query($query))){
			DBManager::Transaction('ROLLBACK');
			throw new Exception();
    	}
		DBManager::Transaction('COMMIT');
		return TRUE;						
	}
}
?>