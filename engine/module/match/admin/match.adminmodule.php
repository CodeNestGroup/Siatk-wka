<?php

require_once(APP_DIR . '/module/match/matchModel.class.php');
require_once('matchModelDaoAdmin.class.php');

class MatchMultiActionController {

    private $_MatchModelDao;

    public function __construct() {
        $this->_MatchModelDao = new MatchModelDao();
    }

    public function addMatchResults_action() {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            $id = $Escore->getVariable('id', 'get');

            $match_summary = $this->_MatchModelDao->getMatchSummaryById($id);

            $match = $this->_MatchModelDao->getMatchById($id);
            $users = $this->_MatchModelDao->getMatchUsers($id,true);

            $mv->addToModel('users', $users);
            $mv->addToModel('match', $match);
            $mv->addToModel('match_summary', $match_summary);
            
            $mv->setView('match/matchsummary.tpl');
            return $mv;
        } else {
            echo 'Nie jesteś zalogowany';
            exit;
        }
        return $mv;
    }

    public function showStat_action()
    {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $mv->addToModel('stat', $this->_MatchModelDao->getStats());
            $mv->setView('match/stat.tpl');
            return $mv;
        } else {
            echo 'Nie jesteś zalogowany';
            exit;
        }
        return $mv;
    }

    public function addMatchResultsForm_action() {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            $vars = $Escore->getPostVars();
            
            $summary = new matchSummaryModel();

            foreach ($vars as $key => $value) {
                switch ($key) {
                    case 'wonsets_A': {
                            $summary->set('wonsets_A', $value);
                        }
                        break;
                    case 'wonsets_B': {
                            $summary->set('wonsets_B', $value);
                        }
                        break;
                    case 'team1': {
                            $summary->set('team1', $value);
                        }
                        break;
                    case 'team2': {
                            $summary->set('team2', $value);
                        }
                    case 'esmat_id':{
                        $summary->set('esmat_id', $value);
                    }
                }
            }
            if($this->_MatchModelDao->saveSummary($summary)){
                header("Location: ?module=match&action=matchdetails&id=".$summary->get('esmat_id')."&msg=ok");
                exit;
            }
        } else {
            echo 'Nie jesteś zalogowany';
            exit;
        }
        return $mv;
    }

    public function inc_counter_action() {
        if (isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $this->_MatchModelDao->countImage($Escore->getVariable('id', 'get'));
        } else {
            echo 'Nie jesteś zalogowany';
            exit;
        }
        return $mv;
    }

    public function vote_action() {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {

            $Escore = Escore::getInstance();

            $this->_MatchModelDao->vote($Escore->getVariable('id', 'get'));

            $id = explode('_', $Escore->getVariable('id', 'get'));
            setcookie("esgallery[" . $id[0] . "][id]", $id[0], time() + 3600);
            setcookie("esgallery[" . $id[0] . "][value]", $id[1], time() + 3600);
            echo 'ok';
            exit;
        } else {
            echo 'Nie jesteś zalogowany';
            exit;
        }
        return $mv;
    }

    public function signin_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();
        if($this->_MatchModelDao->checkMatchSignInTimeOut($Escore->getVariable('id', 'get')))
        {
            header("Location: ?module=match&action=matchdetails&id=" . $Escore->getVariable('id', 'get') . "&msg=signInRejected");
            exit;
        }
        if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR' || $_SESSION['admin']['essysus_login'] == $Escore->getVariable('login', 'get')) {
            if ($this->_MatchModelDao->signIn($Escore->getVariable('id', 'get'), $Escore->getVariable('login', 'get'))) {
                header("Location: ?module=match&action=matchdetails&id=" . $Escore->getVariable('id', 'get') . "&msg=signinok");
                exit;
            }
        } else {
            $mv->setMessage(Lang::getMessage('system', 'access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    public function signout_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();

        if($this->_MatchModelDao->checkMatchSignOutTimeOut($Escore->getVariable('id', 'get')))
        {
            header("Location: ?module=match&action=matchdetails&id=" . $Escore->getVariable('id', 'get') . "&msg=signOutRejected");
            exit;
        }
        $Escore->getVariable('type', 'get');
        if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR' || $_SESSION['admin']['essysus_login'] == $Escore->getVariable('login', 'get')) {
            echo '1';
            if ($this->_MatchModelDao->signOut($Escore->getVariable('id', 'get'), $Escore->getVariable('login', 'get'))) {
                header("Location: ?module=match&action=matchdetails&id=" . $Escore->getVariable('id', 'get') . "&msg=signoutok");
                exit;
            }
        } else {
            $mv->setMessage(Lang::getMessage('system', 'access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    public function matchdetails_action() {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $id = $Escore->getVariable("id", "get");

            $players = $this->_MatchModelDao->getMatchUsers($id);
            $notSignedUpPlayers = $this->_MatchModelDao->getNotSignedUpUsers($id);
            $userRole;
            $signedUpPlayersCounter = count($players);

            if ($_SESSION['admin']['esurole_id'] == "ZAWODNIK") {
                $userRole = "ZAWODNIK";
                $issignedup = 0;
                foreach ($players as $player) {
                    if ($player->get('essysus_login') == $_SESSION['admin']['essysus_login'])
                        $issignedup = 1;
                }
                $mv->addToModel("issignedup", $issignedup);
            }
            else {
                $userRole = "ADMINISTRATOR";
            }

            $match = $this->_MatchModelDao->getMatchById($id);
				$match['esmat_comment'] = base64_decode($match['esmat_comment']);             
				$mv->addToModel("match", $match);

            //$match['esmat_matchdate']
            $mv->addToModel("players", $players);
            $mv->addToModel("notSignedUpPlayers", $notSignedUpPlayers);
            $mv->addToModel("userrole", $userRole);
            $mv->addToModel("signedUpPlayersCounter", $signedUpPlayersCounter);

            $mv->setView('match/matchdetails.tpl');
            return $mv;
        } else {
            $mv->setMessage(Lang::getMessage('system', 'access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    public function & showmatches_action() {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();
            $mv->setView('match/showmatches.tpl');

            if (!is_null($Escore->getVariable('from', 'get')) && $Escore->getVariable('from', 'get') >= 0) {
                $_SESSION['from'] = $Escore->getVariable('from', 'get');
                $result_arr['matches_list'] = $this->_MatchModelDao->getMatches($Escore->getVariable('from', 'get'), ANN_STEP);
            } else {
                $result_arr['matches_list'] = $this->_MatchModelDao->getMatches(0, ANN_STEP);
            }

            $result_arr['comming_match'] = $this->_MatchModelDao->getCommingMatch();

            if ($result_arr['matches_list'] == null)
                $mv->setMessage('Brak ogłoszeń powiązanych z kontem tego użytkownika.');
            else {
                if (!$Escore->getVariable('from', 'get'))
                    $fromvalue = 0;
                else
                    $fromvalue = $Escore->getVariable('from', 'get');
                $quantity = $result_arr['matches_list']['num_rows'];

                $result_arr['urlname'] = $Escore->getVariable('urlname', 'get');
                $result_arr['step'] = ANN_STEP;
                $result_arr['page'] = array();
                if ($quantity <= ANN_STEP) {
                    $mv->setModel($result_arr);
                    return $mv;
                }
                // wypelnienie full
                for ($i = 0, $iter = 0; $i < $quantity; $i += ANN_STEP, $iter++) {
                    $result_arr['page'][$i]['from'] = $i + 1; // zwieksza sie o step
                    $result_arr['page'][$i]['iter'] = $iter + 1; // zwiekasza sie o 1
                    // pogrubienie czcionki, zeby bylo wiadome na ktorej jest stronie
                    if ($fromvalue == $i) {
                        $result_arr['page'][$i]['active'] = true;
                        // ustaw active i next i prev, kiedy nie ma next daj FALSE
                        if ($i + ANN_STEP < $quantity)
                            $result_arr['nextfrom'] = $i + ANN_STEP + 1;
                        else
                            $result_arr['nextfrom'] = false;
                        if ($i - ANN_STEP >= 0)
                            $result_arr['prevfrom'] = $i - ANN_STEP + 1;
                        else
                            $result_arr['prevfrom'] = false;
                    }else {
                        $result_arr['page'][$i]['active'] = false;
                    }
                }
                // wylistyowanie ile trzeba, warunek na przerwanie petli jest w if, break na koncu
                $size = count($result_arr['page']);
                $cur_page = ($fromvalue / ANN_STEP) + 1;
                $maxsize = MAX_SIZE; //maksymalna dlugosc stronnicowania (w przod i w tyl).
                if ($cur_page > $maxsize

                    );

                if ($size >= ($maxsize * 2)) {
                    if ($cur_page > ($maxsize)) {
                        $output1 = array_slice($result_arr['page'], $cur_page - ($maxsize + 1), $size);
                    } else {
                        $output1 = $result_arr['page'];
                    }

                    $result_arr['page'] = array_slice($output1, 0, (($maxsize * 2) + 1));
                }
            }
				for($i = 0; $i < count($result_arr['matches_list']['items']); $i++){
					$result_arr['matches_list']['items'][$i]->esmat_comment = base64_decode($result_arr['matches_list']['items'][$i]->esmat_comment);
				}
            $mv->setModel($result_arr);
        } else {
            $mv->setMessage(Lang::getMessage('system', 'access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    public function & addmatch_action() {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {
            $year['current'] = date('Y');
            $year['next'] = date('Y') + 1;
            $mv->addToModel('year', $year);

            $users = $this->_MatchModelDao->getUsers();
            $mv->addToModel('users', $users);
            $mv->setView('match/addmatch.tpl');
        } else {
            $mv->setMessage(Lang::getMessage('system', 'access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    function GetLastDayofMonth($year, $month) {
        for ($day = 31; $day >= 28; $day--) {
            if (checkdate($month, $day, $year)) {
                return $day;
            }
        }
    }

    public function checkdate_action() {
        $Escore = Escore::getInstance();
        $year = $Escore->getVariable("year", "post");
        $month = $Escore->getVariable("month", "post");
        $day = $Escore->getVariable("day", "post");
        $maxdays = $this->GetLastDayofMonth($year, $month);

        $message;
        if ($year % 4 == 0 && $month == 2) {
            $maxdays = 29;
        }

        if ($maxdays < $day)
            $message['checkresult'] = "wrong";
        else
            $message['checkresult'] = "ok";

        ob_clean();
        header('Content-type: text/xml');

        echo $this->convertTAssoccToXML($message);
        exit;
    }

    private function convertTAssoccToXML(& $array) {
        // $array['one'] = '1'; $array['two'] = '2'; ==> <root><item key="one" value="1" /><item key="two" value="2" /></root>
        $xml = new DOMDocument('1.0', 'UTF-8');
        $root = $xml->createElement('root');
        $xml->appendChild($root);
        foreach ($array as $key => $value) {
            $el = $xml->createElement('item');
            $attrKey = $xml->createAttribute('key');
            $attrKeyText = $xml->createTextNode($key);
            $attrKey->appendChild($attrKeyText);
            $el->appendChild($attrKey);
            $attrValue = $xml->createAttribute('value');
            $attrValueText = $xml->createTextNode($value);
            $attrValue->appendChild($attrValueText);
            $el->appendChild($attrValue);
            $root->appendChild($el);
        }
        return $xml->saveXML();
    }

    public function & addmatchform_action() {
        $mv = new ModelAndView();
        if (isset($_SESSION['admin'])) {
            $Escore = Escore::getInstance();

            //print_r($Escore->getPostVars());exit;

            $signedup_users = $Escore->getVariable("signedup_users", "post");
            $year = $Escore->getVariable("date_year", "post");
            $month = $Escore->getVariable("date_month", "post");
            $day = $Escore->getVariable("date_day", "post");
            $maxdays = $this->GetLastDayofMonth($year, $month);

            if ($year % 4 == 0 && $month == 2) {
                $maxdays = 29;
            }

            if ($maxdays < $Escore->getVariable("date_day", "post"))
                $day = $maxdays; // na wypadek jak by nie bylo walidacji via ajax.

                $objArray = array();
            $objArray['date'] = $year . "-" . $month . "-" . $day;
            $objArray['signedup_users'] = $Escore->getVariable("signedup_users", "post");
            $objArray['start_time'] = $Escore->getVariable("start_h", "post") . ":" . $Escore->getVariable("start_m", "post") . ":00";
            $objArray['end_time'] = $Escore->getVariable("end_h", "post") . ":" . $Escore->getVariable("end_m", "post") . ":00";
            $objArray['slots'] = $Escore->getVariable("slots", "post");
            $objArray['comment'] = base64_encode($Escore->getVariable("comment", "post"));
            $objArray['cycles'] = $Escore->getVariable("cycles", "post");

            if ($this->_MatchModelDao->saveMatch($objArray)) {
                header("Location: ?module=match&action=showmatches&msg=matchsaved");
                exit;
            }
        } else {
            $mv->setMessage(Lang::getMessage('system', 'access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

    public function & deletematch_action() {
        $mv = new ModelAndView();
        if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR') {
            $Escore = Escore::getInstance();

            if ($this->_MatchModelDao->deleteMatch($Escore->getVariable('id', 'get'))) {
                header("Location: ?module=match&action=showmatches&msg=matchdeleted");
                exit;
            }

            //$mv->setView('match/addmatch.tpl');
        } else {
            $mv->setMessage(Lang::getMessage('system', 'access_denied'));
            $mv->setView('layout/error.tpl');
        }
        return $mv;
    }

	public function & addcomment_action() {
		if (isset($_SESSION['admin'])){
			$Escore = Escore::getInstance();
			$id = $Escore->getVariable('id_match', 'post');
			$comment = $Escore->getVariable('comment', 'post');
			$comment = '<span>'.$_SESSION['admin']['essysus_login'].'</span>: '.$comment;
			$this->_MatchModelDao->setComment($id, $comment);
			header("Location: ?module=match&action=matchdetails&id=".$id);
         exit;
		}
	}

}

?>
