<?php

require_once(APP_DIR . '/module/comment/commentModel.class.php');
require_once('commentModelDao.class.php');

class CommentMultiActionController {

    private $_CommentModelDao;

    public function __construct() {
        $this->_CommentModelDao = new CommentModelDao();
    }

    public function getCommentsAjax_action() {
        $Escore = Escore::getInstance();
        ob_clean();
        header("Content-Type: text/html; charset=utf-8"); //potrzebne aby odebrać treść z poslkimi zna


        if (!is_null($Escore->getVariable('from', 'get')))
            $fromvalue = $Escore->getVariable('from', 'get');
        else
            $fromvalue = 0;


        $result_arr['comments_list'] = $this->_CommentModelDao->getCommentsAjax($Escore->getVariable('id', 'get'), $fromvalue);
        $result_arr['prevfrom'] = '';
        $result_arr['nextfrom'] = '';

        $quantity = $result_arr['comments_list']['num_rows'];
        $result_arr['step'] = PUBLIC_COMMENT_STEP;
        $result_arr['page'] = array();
        if ($quantity > PUBLIC_COMMENT_STEP) {
            // wypelnienie full
            for ($i = 0, $iter = 0; $i < $quantity; $i+=PUBLIC_COMMENT_STEP, $iter++) {
                $result_arr['page'][$i]['from'] = $i + 1;  // zwieksza sie o step
                $result_arr['page'][$i]['iter'] = $iter + 1;  // zwiekasza sie o 1
                // pogrubienie czcionki, zeby bylo wiadome na ktorej jest stronie
                if ($fromvalue == $i) {
                    $result_arr['page'][$i]['active'] = TRUE;
                    // ustaw active i next i prev, kiedy nie ma next daj FALSE
                    if ($i + PUBLIC_COMMENT_STEP < $quantity)
                        $result_arr['nextfrom'] = $i + PUBLIC_COMMENT_STEP + 1;
                    else
                        $result_arr['nextfrom'] = FALSE;
                    if ($i - PUBLIC_COMMENT_STEP >= 0)
                        $result_arr['prevfrom'] = $i - PUBLIC_COMMENT_STEP + 1;
                    else
                        $result_arr['prevfrom'] = FALSE;
                } else {
                    $result_arr['page'][$i]['active'] = NULL;
                }
            }
        }
        //	print_r($result_arr);
        unset($result_arr['comments_list']['num_rows']);


        //print_r($result_arr);
        if ($result_arr) {
            $xml = new DOMDocument('1.0', 'UTF-8');
            $root = $xml->createElement("comments");
            $main = $xml->createElement("pages");
            $xml->appendChild($root);
            foreach ($result_arr['comments_list'] as $comments_list) {
                foreach ($comments_list as $key => $value) {
                    if ($key == 'escom_id')
                        $child = $xml->createElement("comment");

                    $atr = $xml->createAttribute($key);
                    $text = $xml->createTextNode($value);

                    $atr->appendChild($text);
                    $child->appendChild($atr);
                    $root->appendChild($child);
                }
            }

            foreach ($result_arr['page'] as $page) {
                foreach ($page as $key => $value) {
                    $k = $xml->createElement($key);
                    $v = $xml->createAttribute('value');
                    $text = $xml->createTextNode($value);

                    $k->appendChild($v);
                    $v->appendChild($text);

                    $root->appendChild($k);
                }
            }
            $nextf = $xml->createElement('nextfrom');
            $prevf = $xml->createElement('prevfrom');
            $prevvalue = $xml->createAttribute('value');
            $nextvalue = $xml->createAttribute('value');
            //if(isset($result_arr['nextfrom']))
            //echo $result_arr['nextfrom'];
            $nexttext = $xml->createTextNode($result_arr['nextfrom']);
            //if(isset($result_arr['prevfrom']))
            $prevtext = $xml->createTextNode($result_arr['prevfrom']);


            $nextf->appendChild($nextvalue);
            $nextvalue->appendChild($nexttext);
            $prevf->appendChild($prevvalue);
            $prevvalue->appendChild($prevtext);

            $step = $xml->createElement('step');
            $step_att = $xml->createAttribute('value');
            $step_text = $xml->createTextNode($result_arr['step']);

            $step->appendChild($step_att);
            $step_att->appendChild($step_text);
            $root->appendChild($step);

            $root->appendChild($nextf);
            $root->appendChild($prevf);


            echo $xml->saveXML();
        } else {
            echo 'Brak komentarzy.';
        }
        ob_end_flush();
        exit;
    }

    public function check_img_action() {
        $Escore = Escore::getInstance();

        $oid = $Escore->getVariable('o_id', 'post');
        //Echo 'oid='.$oid.'<br />';
        //print_r($_SESSION);
        //echo '<br />';

        if ($_SESSION['obrazek'] == $oid) {
            ob_clean();
            header("Content-type: text/xml; charset=ISO-8859-2");
            $xml = new DOMDocument('1.0', 'UTF-8');
            $root = $xml->createElement('image');
            $atr = $xml->createAttribute('validation');
            $text = $xml->createTextNode('true');
            $root->appendChild($atr);
            $atr->appendChild($text);
            $xml->appendChild($root);
            echo $xml->saveXML();
            ob_end_flush();
            exit;
        } else {
            ob_clean();
            header("Content-type: text/xml; charset=ISO-8859-2");
            $xml = new DOMDocument('1.0', 'UTF-8');
            $root = $xml->createElement('image');
            $atr = $xml->createAttribute('validation');
            $text = $xml->createTextNode('false');
            $xml->appendChild($root);
            $root->appendChild($atr);
            $atr->appendChild($text);
            echo $xml->saveXML();
            ob_end_flush();
            exit;
        }
    }

    //--------------------------------------------------------------

    public function addComment_action() {
        $Escore = Escore::getInstance();

        $parameters = $Escore->getPostVars();
        //print_r($parameters);
        $comment = new commentModel();

        foreach ($parameters as $key => $value) {
            switch ($key) {
                case 'esmat_id': {
                        $comment->set('esmat_id', $value);
                    }
                    break;
                case 'escom_desc': {
                        $comment->set('escom_desc', $value);
                    }
                    break;
            }
        }
        $this->_CommentModelDao->saveComment($comment);
    }

    //-----------------------------------------------------

    public function getComment_action() {
        $Escore = Escore::getInstance();
        ob_clean();

        if (!is_null($Escore->getVariable('from', 'get')))
            $fromvalue = $Escore->getVariable('from', 'get');
        else
            $fromvalue = 0;


        $result_arr['comments_list'] = $this->_CommentModelDao->getComments($Escore->getVariable('id', 'get'), $fromvalue);

        $result_arr['prevfrom'] = '';
        $result_arr['nextfrom'] = '';

        $quantity = $result_arr['comments_list']['num_rows'];
        $result_arr['step'] = PUBLIC_COMMENT_STEP;
        $result_arr['page'] = array();
        if ($quantity > PUBLIC_COMMENT_STEP) {
            // wypelnienie full
            for ($i = 0, $iter = 0; $i < $quantity; $i+=PUBLIC_COMMENT_STEP, $iter++) {
                $result_arr['page'][$i]['from'] = $i + 1;  // zwieksza sie o step
                $result_arr['page'][$i]['iter'] = $iter + 1;  // zwiekasza sie o 1
                // pogrubienie czcionki, zeby bylo wiadome na ktorej jest stronie
                if ($fromvalue == $i) {
                    $result_arr['page'][$i]['active'] = TRUE;
                    // ustaw active i next i prev, kiedy nie ma next daj FALSE
                    if ($i + PUBLIC_COMMENT_STEP < $quantity)
                        $result_arr['nextfrom'] = $i + PUBLIC_COMMENT_STEP + 1;
                    else
                        $result_arr['nextfrom'] = FALSE;
                    if ($i - PUBLIC_COMMENT_STEP >= 0)
                        $result_arr['prevfrom'] = $i - PUBLIC_COMMENT_STEP + 1;
                    else
                        $result_arr['prevfrom'] = FALSE;
                } else {
                    $result_arr['page'][$i]['active'] = NULL;
                }
            }
        }
        //	print_r($result_arr);
        unset($result_arr['comments_list']['num_rows']);


        //print_r($result_arr);
        if ($result_arr) {
            header("Content-type: text/xml; charset=ISO-8859-2");
            $xml = new DOMDocument('1.0', 'UTF-8');
            $root = $xml->createElement("comments");
            $main = $xml->createElement("pages");
            $xml->appendChild($root);
            foreach ($result_arr['comments_list'] as $comments_list) {
                foreach ($comments_list as $key => $value) {
                    if ($key == 'escom_id')
                        $child = $xml->createElement("comment");

                    $atr = $xml->createAttribute($key);
                    $text = $xml->createTextNode($value);

                    $atr->appendChild($text);
                    $child->appendChild($atr);
                    $root->appendChild($child);
                }
            }

            foreach ($result_arr['page'] as $page) {
                foreach ($page as $key => $value) {
                    $k = $xml->createElement($key);
                    $v = $xml->createAttribute('value');
                    $text = $xml->createTextNode($value);

                    $k->appendChild($v);
                    $v->appendChild($text);

                    $root->appendChild($k);
                }
            }
            $nextf = $xml->createElement('nextfrom');
            $prevf = $xml->createElement('prevfrom');
            $prevvalue = $xml->createAttribute('value');
            $nextvalue = $xml->createAttribute('value');
            //if(isset($result_arr['nextfrom']))
            //echo $result_arr['nextfrom'];
            $nexttext = $xml->createTextNode($result_arr['nextfrom']);
            //if(isset($result_arr['prevfrom']))
            $prevtext = $xml->createTextNode($result_arr['prevfrom']);


            $nextf->appendChild($nextvalue);
            $nextvalue->appendChild($nexttext);
            $prevf->appendChild($prevvalue);
            $prevvalue->appendChild($prevtext);

            $step = $xml->createElement('step');
            $step_att = $xml->createAttribute('value');
            $step_text = $xml->createTextNode($result_arr['step']);

            $step->appendChild($step_att);
            $step_att->appendChild($step_text);
            $root->appendChild($step);

            $root->appendChild($nextf);
            $root->appendChild($prevf);


            echo $xml->saveXML();
        } else {
            echo 'Brak komentarzy.';
        }
        ob_end_flush();
        exit;
    }

}

?>