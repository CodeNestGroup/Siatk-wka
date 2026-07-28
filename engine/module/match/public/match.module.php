<?php

require_once(APP_DIR . '/module/match/matchModel.class.php');
require_once('matchModelDao.class.php');

class MatchMultiActionController {

    private $_MatchModelDao;

    public function __construct() {
        $this->_MatchModelDao = new MatchModelDao();
    }

    public function matchdetails_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();
        $id = $Escore->getVariable("id", "get");
       
        $players = $this->_MatchModelDao->getMatchUsers($id);
        $notSignedUpPlayers = $this->_MatchModelDao->getNotSignedUpUsers($id);

        $userRole;
        $signedUpPlayersCounter = count($players);


        $match = $this->_MatchModelDao->getMatchById($id);


        $mv->addToModel("match", $match);
        //$match['esmat_matchdate']

        $mv->addToModel("players", $players);
        $mv->addToModel("notSignedUpPlayers", $notSignedUpPlayers);
        //$mv->addToModel("userrole", $userRole);
        $mv->addToModel("signedUpPlayersCounter", $signedUpPlayersCounter);

        $mv->setView('layout/matchdetails.tpl');
        return $mv;
    }

    public function & showmatches_action() {
        $mv = new ModelAndView();
        $Escore = Escore::getInstance();

        $result_arr['matches_list'] = $this->_MatchModelDao->getMatches(0, ANN_STEP);

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
                return $result_arr;
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

        return $result_arr;
        //$mv->setModel($result_arr);
    }

    public function & showmatches2_action() {
        $mv = new ModelAndView();
            $Escore = Escore::getInstance();
            $mv->setView('layout/matches.tpl');

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

            $mv->setModel($result_arr);
        return $mv;
    }

}

?>
