<?php /* Smarty version 2.6.17, created on 2018-09-18 08:25:16
         compiled from match/matchsummary.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<script type="text/javascript" src="js/jquery.livequery.js"></script>
<form action="?module=match&amp;action=addmatchresultsform" method="post">
    <fieldset>
        <legend>Wyniki meczu z dnia: <?php echo $this->_tpl_vars['escore']['match']['esmat_matchdate']; ?>
</legend>
        <table style="width: 984px;" cellpadding="5">
            <tr>
                <th>Zespół A</th>
                <th>Zespół B</th>
            </tr>
            <tr>
                <td>
                    <select name="team1[]" id="team1" Multiple size=15 style="width: 100%" title="Kliknij dwukrotnie, aby przenieść do drużyny przeciwnej.">
                    <?php if ($this->_tpl_vars['escore']['match_summary'] == ''): ?>
                        <?php $_from = $this->_tpl_vars['escore']['users']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['user'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['user']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['user']):
        $this->_foreach['user']['iteration']++;
?>
                            <option val="<?php echo $this->_tpl_vars['user']->essysus_login; ?>
"><?php echo $this->_tpl_vars['user']->essysus_login; ?>
 </option>
                        <?php endforeach; endif; unset($_from); ?>
                    <?php else: ?>
                        <?php $_from = $this->_tpl_vars['escore']['match_summary']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['user'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['user']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['user']):
        $this->_foreach['user']['iteration']++;
?>
                            <?php if ($this->_tpl_vars['user']->esmt_team == '0'): ?>
                            <option val="<?php echo $this->_tpl_vars['user']->essysus_login; ?>
"><?php echo $this->_tpl_vars['user']->essysus_login; ?>
</option>
                            <?php endif; ?>
                        <?php endforeach; endif; unset($_from); ?>
                    <?php endif; ?>
                    </select>
                </td>
                <td>
                    <select name="team2[]" id="team2" Multiple size=15 style="width: 100%;" title="Kliknij dwukrotnie, aby przenieść do drużyny przeciwnej.">
                    <?php if ($this->_tpl_vars['escore']['match_summary'] != ''): ?>
                        <?php $_from = $this->_tpl_vars['escore']['match_summary']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['user'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['user']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['user']):
        $this->_foreach['user']['iteration']++;
?>
                            <?php if ($this->_tpl_vars['user']->esmt_team == '1'): ?>
                            <option val="<?php echo $this->_tpl_vars['user']->essysus_login; ?>
"><?php echo $this->_tpl_vars['user']->essysus_login; ?>
</option>
                            <?php endif; ?>
                        <?php endforeach; endif; unset($_from); ?>
                    <?php endif; ?>
                    </select>
                </td>
            </tr>
            <tr>
                <td>Wygranych setów: <input style="width: 20px" id="wonsets_A" name="wonsets_A" type="text" maxlength="1" value="<?php if ($this->_tpl_vars['escore']['match']['esmat_team1points'] == ''): ?>0<?php else: ?><?php echo $this->_tpl_vars['escore']['match']['esmat_team1points']; ?>
<?php endif; ?>"/>
                    
                </td>
                <td>Wygranych setów: <input style="width: 20px" id="wonsets_B" name="wonsets_B" type="text" maxlength="1" value="<?php if ($this->_tpl_vars['escore']['match']['esmat_team2points'] == ''): ?>0<?php else: ?><?php echo $this->_tpl_vars['escore']['match']['esmat_team2points']; ?>
<?php endif; ?>" /></td>
            </tr>
            <tr>
                <td colspan="2"><span id="player_delete" style="color: red; cursor: pointer; padding-top: 2px;">Usuń zawodników</span>
                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Usuwa ze statystyk meczu zawdoników zaznaczonych w obu kolumnach. <br />Aby zaznaczyć kilku zawdoników jednocześnie przytrzymaj shift.</div>
                </td>
            </tr>
            <tr style="text-align: center">
                <td colspan="2">
                    <input type="hidden" name="esmat_id" value="<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
" />
                    <input id="submit_matchsummary" type="image" src="images/submit_button.jpg" />
                </td>
            </tr>
        </table>
    </fieldset>
</form>
<!--<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>-->