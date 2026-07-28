<?php

class menuModelDao {
	
	// sprawdz czy mozna wyswietlnic menu-------------------------------------------------
	
	public function doesSectionCanBeShowed($idsec){
		$query = 'SELECT essec_active FROM es_section WHERE essec_id="'.$idsec.'";';
		if (DB::isError($result = DBManager::getOne($query))){
    		throw new Exception();
			DBManager::Transaction('ROLLBACK');
			return FALSE;
    	}
    	else{
    		DBManager::Transaction('COMMIT');
    		if($result)
    			return TRUE;
    		else return FALSE;
    	}				
	}

	// na podstawie kategorii,TOP NULL,Category By Section + nazwa sekcji + lista--------

	public function & getCategoryListBySectionId($idsec,$getsub = TRUE, $idcat){
		$query = 'SELECT cat.escat_id, cat.escat_parent,cat.escat_urlname, cat.escat_link, cat.escat_target, title.eslg_content AS escat_title
				  FROM es_category AS cat, es_lang AS title
				  WHERE cat.escat_titleid = title.eslg_id
				  AND title.eslg_symbol = ( 
					CASE WHEN (
					SELECT count( * ) 
					FROM es_lang AS langtable
					WHERE langtable.eslg_id = cat.escat_titleid
					AND langtable.eslg_symbol = "'.$_SESSION['lang'].'" ) = "1"
					THEN "'.$_SESSION['lang'].'"
					ELSE "'.DEFAULT_LANG.'"
					END 
					)
				AND cat.escat_parent IS NULL 
				AND cat.escat_active = "1"
				AND cat.essec_id = "'.$idsec.'"
				ORDER BY cat.escat_position ASC 
					';
		DBManager::Transaction('BEGIN');

    	if (DB::isError($result = DBManager::Query($query))){
    		throw new Exception('Pobranie danych kategorii nie powiodło się.');
			DBManager::Transaction('ROLLBACK');
			return false;
    	}
    	else {
	   		$result_arr = array();
    		$i=0;
    		// get subcat for top category of section
    		while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
                        $line['current_cat'] = $idcat;
    			$result_arr[$i] = new menuModel($line);
                        
    			if($getsub)
    				$result_arr[$i]->setChildren(menuModelDao::getSubCategory($result_arr[$i]->get('escat_id')));
    			$i++;
     		}    	
     		DBManager::Transaction('COMMIT');
			return $result_arr;
		}	
	
	}
	// get SubCategory , wykorzystane w dao, rekurencja, i czy FULL -------------------------------
	
	public function & getSubCategory($idpar,$lg = DEFAULT_LANG){		
		$query_subcat = 'SELECT cat.escat_id, (SELECT count(*) FROM es_category_has_es_articles AS cathasart WHERE cathasart.escat_id=cat.escat_id) AS articles_count,cat.escat_parent, cat.escat_urlname, cat.escat_link, cat.escat_target,title.eslg_content AS escat_title
                                    FROM es_category AS cat, es_lang AS title
                                    WHERE cat.escat_titleid = title.eslg_id
                                    AND title.eslg_symbol = (
                                    CASE WHEN (
                                    SELECT count(*)
                                    FROM es_lang AS langtable
                                    WHERE langtable.eslg_id = cat.escat_titleid
                                    AND langtable.eslg_symbol = "'.$_SESSION['lang'].'" ) = "1"
                                    THEN "'.$_SESSION['lang'].'"
                                    ELSE "'.DEFAULT_LANG.'"
                                    END
                                    )
                                    AND cat.escat_parent = "'.$idpar.'"
                                    AND cat.escat_active = "1"
                                    ORDER BY cat.escat_position ASC
                                    ;';
		DBManager::Transaction('BEGIN');

    	if (DB::isError($result = DBManager::Query($query_subcat))){
    		throw new Exception('Pobranie danych podkategorii nie powiodło się.');
			DBManager::Transaction('ROLLBACK');
			return false;
    	}
    	else {
	   		$result_arr = array();
    		$i=0;
    		while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    			$result_arr[$i] = new menuModel($line);
    			$result_arr[$i]->setChildren(menuModelDao::getSubCategory($result_arr[$i]->get('escat_id')));
    			$i++;
     		}    	
     		DBManager::Transaction('COMMIT');
			return $result_arr;
		}	
	}
        //---------------------------------------------------------------------------
/*
 * 		
 *
 *
 */
	public function & getSubCategory2($idpar,$lg = DEFAULT_LANG){
		$query_subcat = 'SELECT cat.escat_id, cat.escat_link, (SELECT count(*) FROM es_category_has_es_articles AS cathasart WHERE cathasart.escat_id=cat.escat_id) AS articles_count,cat.escat_parent, cat.escat_urlname, cat.escat_link, cat.escat_target,title.eslg_content AS escat_title,
                                       (SELECT (SELECT eslg_content FROM es_lang WHERE eslg_id = art.esart_descid AND eslg_symbol = "pl")AS esart_desc FROM es_articles as art JOIN es_category_has_es_articles  as ca ON art.esart_id = ca.esart_id
                                        JOIN es_category as c ON ca.escat_id = c.escat_id WHERE ca.escat_id = cat.escat_id and art.esart_active = "1" LIMIT 1) as esart_desc
                                    FROM es_category AS cat, es_lang AS title
                                    WHERE cat.escat_titleid = title.eslg_id
                                    AND title.eslg_symbol = (
                                    CASE WHEN (
                                    SELECT count(*)
                                    FROM es_lang AS langtable
                                    WHERE langtable.eslg_id = cat.escat_titleid
                                    AND langtable.eslg_symbol = "'.$_SESSION['lang'].'" ) = "1"
                                    THEN "'.$_SESSION['lang'].'"
                                    ELSE "'.DEFAULT_LANG.'"
                                    END
                                    )
                                    AND cat.escat_parent = "'.$idpar.'"
                                    AND cat.escat_active = "1"
                                    ORDER BY cat.escat_position ASC
                                    ;';
		DBManager::Transaction('BEGIN');

    	if (DB::isError($result = DBManager::Query($query_subcat))){
    		throw new Exception('Pobranie danych podkategorii nie powiodło się.');
			DBManager::Transaction('ROLLBACK');
			return false;
    	}
    	else {
	   		$result_arr = array();
    		$i=0;
    		while($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)){
    			$result_arr[$i] = new menuModel($line);
    			$i++;
     		}
     		DBManager::Transaction('COMMIT');
			return $result_arr;
		}
	}

	//---------------------------------------------------------------------------

        public function hasChildrenAndParentIsNull($id){
                $query = 'SELECT count(*) FROM es_category WHERE escat_parent="'.$id.'" AND (SELECT escat_parent FROM es_category WHERE escat_id = "'.$id.'" ) IS NULL ;';
		$result = DBManager::getOne($query);
		if($result==0) return FALSE;
		else return TRUE;
        }

        //---------------------------------------------------------------------------
	public function hasChildren($id){
		$query = 'SELECT count(*) FROM es_category WHERE escat_parent="'.$id.'";';
		$result = DBManager::getOne($query);
		if($result==0) return FALSE;
		else return TRUE;
	}
}