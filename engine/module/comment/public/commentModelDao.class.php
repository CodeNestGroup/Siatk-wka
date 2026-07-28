<?php

class commentModelDao {

    public function saveComment(commentModel & $comment) {
        DBManager::Transaction('BEGIN');
        $escom_id = DBManager::generateId('es_comment', 'escom_id');
        if (COMMENT_MODERATION == true) {
            $comment->set('escom_active', 0);
        } else {
            $comment->set('escom_active', 1);
        }
        $query = 'INSERT INTO es_comment(escom_id, escom_desc, esmat_id, escom_active)
					VALUES(
							"' . $escom_id . '",
							"' . $comment->get('escom_desc') . '",
							"' . $comment->get('esmat_id') . '",
							"' . $comment->get('escom_active') . '"
					)';
        if (DB::isError(DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
        }
        DBManager::Transaction('COMMIT');
        return true;
    }

    public function getComments($id, $limit1 = NULL) {
        DBManager::Transaction('BEGIN');
        if ($limit1)
            $limit = 'LIMIT ' . $limit1 . ',' . PUBLIC_COMMENT_STEP; else
            $limit = 'LIMIT 0,' . PUBLIC_COMMENT_STEP;
        $query = 'SELECT SQL_CALC_FOUND_ROWS *,escom_id, escom_desc FROM es_comment WHERE esmat_id = "' . $id . '"
					AND escom_active = "1"
					ORDER BY escom_createdate ' . $limit . ';';
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
        } else {
            $result_arr = array();
            $query_calc = 'SELECT FOUND_ROWS();';

            $result_arr['num_rows'] = DBManager::getOne($query_calc);
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $obj = new commentModel($line);
                $result_arr[] = $obj;
            }
            DBManager::Transaction('COMMIT');
            return $result_arr;
        }
    }

    public function getCommentsAjax($id, $limit1 = NULL) {
        DBManager::Transaction('BEGIN');
        if ($limit1)
            $limit = 'LIMIT ' . $limit1 . ',' . PUBLIC_COMMENT_STEP; else
            $limit = 'LIMIT 0,' . PUBLIC_COMMENT_STEP;
        $query = 'SELECT SQL_CALC_FOUND_ROWS *,escom_id, escom_addedby, escom_desc FROM es_comment WHERE esmat_id = "' . $id . '"
					AND escom_active = "1"
					ORDER BY escom_createdate ' . $limit . ';';
        //echo $query;exit;
        if (DB::isError($result = DBManager::Query($query))) {
            DBManager::Transaction('ROLLBACK');
            throw new Exception();
        } else {
            $result_arr = array();
            $query_calc = 'SELECT FOUND_ROWS();';

            $result_arr['num_rows'] = DBManager::getOne($query_calc);
            while ($line = & $result->fetchRow(DB_FETCHMODE_ASSOC)) {
                $obj = new commentModel($line);
                $result_arr[] = $obj;
            }
            DBManager::Transaction('COMMIT');
            return $result_arr;
        }
    }

}

?>