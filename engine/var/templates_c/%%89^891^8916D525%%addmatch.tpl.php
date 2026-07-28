<?php /* Smarty version 2.6.17, created on 2018-09-17 15:11:48
         compiled from match/addmatch.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<script type="text/javascript" src="js/jquery.livequery.js"></script>
<form action="?module=match&amp;action=addmatchform" method="post">
    <fieldset>
        <legend>Zaplnauj nowy mecz</legend>
        <table cellpadding="5" cellspacing="0" border="0">
            <tr>
                <td style="width: 120px;">
                    Dzień:
                </td>
                <td>
                    <select id="date_day" class="select" name="date_day">
                        <?php unset($this->_sections['date_day']);
$this->_sections['date_day']['name'] = 'date_day';
$this->_sections['date_day']['loop'] = is_array($_loop=31) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['date_day']['show'] = true;
$this->_sections['date_day']['max'] = $this->_sections['date_day']['loop'];
$this->_sections['date_day']['step'] = 1;
$this->_sections['date_day']['start'] = $this->_sections['date_day']['step'] > 0 ? 0 : $this->_sections['date_day']['loop']-1;
if ($this->_sections['date_day']['show']) {
    $this->_sections['date_day']['total'] = $this->_sections['date_day']['loop'];
    if ($this->_sections['date_day']['total'] == 0)
        $this->_sections['date_day']['show'] = false;
} else
    $this->_sections['date_day']['total'] = 0;
if ($this->_sections['date_day']['show']):

            for ($this->_sections['date_day']['index'] = $this->_sections['date_day']['start'], $this->_sections['date_day']['iteration'] = 1;
                 $this->_sections['date_day']['iteration'] <= $this->_sections['date_day']['total'];
                 $this->_sections['date_day']['index'] += $this->_sections['date_day']['step'], $this->_sections['date_day']['iteration']++):
$this->_sections['date_day']['rownum'] = $this->_sections['date_day']['iteration'];
$this->_sections['date_day']['index_prev'] = $this->_sections['date_day']['index'] - $this->_sections['date_day']['step'];
$this->_sections['date_day']['index_next'] = $this->_sections['date_day']['index'] + $this->_sections['date_day']['step'];
$this->_sections['date_day']['first']      = ($this->_sections['date_day']['iteration'] == 1);
$this->_sections['date_day']['last']       = ($this->_sections['date_day']['iteration'] == $this->_sections['date_day']['total']);
?>
                        <option><?php echo $this->_sections['date_day']['iteration']; ?>
</option>
                        <?php endfor; endif; ?>
                    </select>
                    /
                    <select id="date_month" class="select" name="date_month">
                        <?php unset($this->_sections['date_month']);
$this->_sections['date_month']['name'] = 'date_month';
$this->_sections['date_month']['loop'] = is_array($_loop=12) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['date_month']['show'] = true;
$this->_sections['date_month']['max'] = $this->_sections['date_month']['loop'];
$this->_sections['date_month']['step'] = 1;
$this->_sections['date_month']['start'] = $this->_sections['date_month']['step'] > 0 ? 0 : $this->_sections['date_month']['loop']-1;
if ($this->_sections['date_month']['show']) {
    $this->_sections['date_month']['total'] = $this->_sections['date_month']['loop'];
    if ($this->_sections['date_month']['total'] == 0)
        $this->_sections['date_month']['show'] = false;
} else
    $this->_sections['date_month']['total'] = 0;
if ($this->_sections['date_month']['show']):

            for ($this->_sections['date_month']['index'] = $this->_sections['date_month']['start'], $this->_sections['date_month']['iteration'] = 1;
                 $this->_sections['date_month']['iteration'] <= $this->_sections['date_month']['total'];
                 $this->_sections['date_month']['index'] += $this->_sections['date_month']['step'], $this->_sections['date_month']['iteration']++):
$this->_sections['date_month']['rownum'] = $this->_sections['date_month']['iteration'];
$this->_sections['date_month']['index_prev'] = $this->_sections['date_month']['index'] - $this->_sections['date_month']['step'];
$this->_sections['date_month']['index_next'] = $this->_sections['date_month']['index'] + $this->_sections['date_month']['step'];
$this->_sections['date_month']['first']      = ($this->_sections['date_month']['iteration'] == 1);
$this->_sections['date_month']['last']       = ($this->_sections['date_month']['iteration'] == $this->_sections['date_month']['total']);
?>
                        <option><?php echo $this->_sections['date_month']['iteration']; ?>
</option>
                        <?php endfor; endif; ?>
                    </select>
                    /
                    <select id="date_year" class="select" name="date_year">
                        <option><?php echo $this->_tpl_vars['escore']['year']['current']; ?>
</option>
                        <option><?php echo $this->_tpl_vars['escore']['year']['next']; ?>
</option>
                    </select>
                    <span style="display: none; color: red;" id="date_error">Data jest nieprawidłowa</span>
                </td>
            </tr>
            <tr>
                <td>
                    Godzina:
                </td>
                <td>
                    Początek:
                    <select name="start_h">
                        <option>00</option>
                        <?php unset($this->_sections['start_h']);
$this->_sections['start_h']['name'] = 'start_h';
$this->_sections['start_h']['loop'] = is_array($_loop=23) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['start_h']['show'] = true;
$this->_sections['start_h']['max'] = $this->_sections['start_h']['loop'];
$this->_sections['start_h']['step'] = 1;
$this->_sections['start_h']['start'] = $this->_sections['start_h']['step'] > 0 ? 0 : $this->_sections['start_h']['loop']-1;
if ($this->_sections['start_h']['show']) {
    $this->_sections['start_h']['total'] = $this->_sections['start_h']['loop'];
    if ($this->_sections['start_h']['total'] == 0)
        $this->_sections['start_h']['show'] = false;
} else
    $this->_sections['start_h']['total'] = 0;
if ($this->_sections['start_h']['show']):

            for ($this->_sections['start_h']['index'] = $this->_sections['start_h']['start'], $this->_sections['start_h']['iteration'] = 1;
                 $this->_sections['start_h']['iteration'] <= $this->_sections['start_h']['total'];
                 $this->_sections['start_h']['index'] += $this->_sections['start_h']['step'], $this->_sections['start_h']['iteration']++):
$this->_sections['start_h']['rownum'] = $this->_sections['start_h']['iteration'];
$this->_sections['start_h']['index_prev'] = $this->_sections['start_h']['index'] - $this->_sections['start_h']['step'];
$this->_sections['start_h']['index_next'] = $this->_sections['start_h']['index'] + $this->_sections['start_h']['step'];
$this->_sections['start_h']['first']      = ($this->_sections['start_h']['iteration'] == 1);
$this->_sections['start_h']['last']       = ($this->_sections['start_h']['iteration'] == $this->_sections['start_h']['total']);
?>
                        <option><?php if ($this->_sections['start_h']['iteration'] < 10): ?>0<?php endif; ?><?php echo $this->_sections['start_h']['iteration']; ?>
</option>
                        <?php endfor; endif; ?>
                    </select>
                    :
                    <select name="start_m">
                        <option>00</option>
                        <?php unset($this->_sections['start_m']);
$this->_sections['start_m']['name'] = 'start_m';
$this->_sections['start_m']['loop'] = is_array($_loop=59) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['start_m']['show'] = true;
$this->_sections['start_m']['max'] = $this->_sections['start_m']['loop'];
$this->_sections['start_m']['step'] = 1;
$this->_sections['start_m']['start'] = $this->_sections['start_m']['step'] > 0 ? 0 : $this->_sections['start_m']['loop']-1;
if ($this->_sections['start_m']['show']) {
    $this->_sections['start_m']['total'] = $this->_sections['start_m']['loop'];
    if ($this->_sections['start_m']['total'] == 0)
        $this->_sections['start_m']['show'] = false;
} else
    $this->_sections['start_m']['total'] = 0;
if ($this->_sections['start_m']['show']):

            for ($this->_sections['start_m']['index'] = $this->_sections['start_m']['start'], $this->_sections['start_m']['iteration'] = 1;
                 $this->_sections['start_m']['iteration'] <= $this->_sections['start_m']['total'];
                 $this->_sections['start_m']['index'] += $this->_sections['start_m']['step'], $this->_sections['start_m']['iteration']++):
$this->_sections['start_m']['rownum'] = $this->_sections['start_m']['iteration'];
$this->_sections['start_m']['index_prev'] = $this->_sections['start_m']['index'] - $this->_sections['start_m']['step'];
$this->_sections['start_m']['index_next'] = $this->_sections['start_m']['index'] + $this->_sections['start_m']['step'];
$this->_sections['start_m']['first']      = ($this->_sections['start_m']['iteration'] == 1);
$this->_sections['start_m']['last']       = ($this->_sections['start_m']['iteration'] == $this->_sections['start_m']['total']);
?>
                        <option><?php if ($this->_sections['start_m']['iteration'] < 10): ?>0<?php endif; ?><?php echo $this->_sections['start_m']['iteration']; ?>
</option>
                        <?php endfor; endif; ?>
                    </select>
                    Koniec:
                    <select name="end_h">
                        <option>00</option>
                        <?php unset($this->_sections['end_h']);
$this->_sections['end_h']['name'] = 'end_h';
$this->_sections['end_h']['loop'] = is_array($_loop=23) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['end_h']['show'] = true;
$this->_sections['end_h']['max'] = $this->_sections['end_h']['loop'];
$this->_sections['end_h']['step'] = 1;
$this->_sections['end_h']['start'] = $this->_sections['end_h']['step'] > 0 ? 0 : $this->_sections['end_h']['loop']-1;
if ($this->_sections['end_h']['show']) {
    $this->_sections['end_h']['total'] = $this->_sections['end_h']['loop'];
    if ($this->_sections['end_h']['total'] == 0)
        $this->_sections['end_h']['show'] = false;
} else
    $this->_sections['end_h']['total'] = 0;
if ($this->_sections['end_h']['show']):

            for ($this->_sections['end_h']['index'] = $this->_sections['end_h']['start'], $this->_sections['end_h']['iteration'] = 1;
                 $this->_sections['end_h']['iteration'] <= $this->_sections['end_h']['total'];
                 $this->_sections['end_h']['index'] += $this->_sections['end_h']['step'], $this->_sections['end_h']['iteration']++):
$this->_sections['end_h']['rownum'] = $this->_sections['end_h']['iteration'];
$this->_sections['end_h']['index_prev'] = $this->_sections['end_h']['index'] - $this->_sections['end_h']['step'];
$this->_sections['end_h']['index_next'] = $this->_sections['end_h']['index'] + $this->_sections['end_h']['step'];
$this->_sections['end_h']['first']      = ($this->_sections['end_h']['iteration'] == 1);
$this->_sections['end_h']['last']       = ($this->_sections['end_h']['iteration'] == $this->_sections['end_h']['total']);
?>
                        <option><?php if ($this->_sections['end_h']['iteration'] < 10): ?>0<?php endif; ?><?php echo $this->_sections['end_h']['iteration']; ?>
</option>
                        <?php endfor; endif; ?>
                    </select>
                    :
                    <select name="end_m">
                        <option>00</option>
                        <?php unset($this->_sections['end_m']);
$this->_sections['end_m']['name'] = 'end_m';
$this->_sections['end_m']['loop'] = is_array($_loop=59) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['end_m']['show'] = true;
$this->_sections['end_m']['max'] = $this->_sections['end_m']['loop'];
$this->_sections['end_m']['step'] = 1;
$this->_sections['end_m']['start'] = $this->_sections['end_m']['step'] > 0 ? 0 : $this->_sections['end_m']['loop']-1;
if ($this->_sections['end_m']['show']) {
    $this->_sections['end_m']['total'] = $this->_sections['end_m']['loop'];
    if ($this->_sections['end_m']['total'] == 0)
        $this->_sections['end_m']['show'] = false;
} else
    $this->_sections['end_m']['total'] = 0;
if ($this->_sections['end_m']['show']):

            for ($this->_sections['end_m']['index'] = $this->_sections['end_m']['start'], $this->_sections['end_m']['iteration'] = 1;
                 $this->_sections['end_m']['iteration'] <= $this->_sections['end_m']['total'];
                 $this->_sections['end_m']['index'] += $this->_sections['end_m']['step'], $this->_sections['end_m']['iteration']++):
$this->_sections['end_m']['rownum'] = $this->_sections['end_m']['iteration'];
$this->_sections['end_m']['index_prev'] = $this->_sections['end_m']['index'] - $this->_sections['end_m']['step'];
$this->_sections['end_m']['index_next'] = $this->_sections['end_m']['index'] + $this->_sections['end_m']['step'];
$this->_sections['end_m']['first']      = ($this->_sections['end_m']['iteration'] == 1);
$this->_sections['end_m']['last']       = ($this->_sections['end_m']['iteration'] == $this->_sections['end_m']['total']);
?>
                        <option><?php if ($this->_sections['end_m']['iteration'] < 10): ?>0<?php endif; ?><?php echo $this->_sections['end_m']['iteration']; ?>
</option>
                        <?php endfor; endif; ?>
                    </select>
                </td>
            </tr>
            <tr>
                <td>Liczba miejsc:</td>
                <td>
                    <select name="slots">
                        <?php unset($this->_sections['slots']);
$this->_sections['slots']['name'] = 'slots';
$this->_sections['slots']['loop'] = is_array($_loop=99) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['slots']['show'] = true;
$this->_sections['slots']['max'] = $this->_sections['slots']['loop'];
$this->_sections['slots']['step'] = 1;
$this->_sections['slots']['start'] = $this->_sections['slots']['step'] > 0 ? 0 : $this->_sections['slots']['loop']-1;
if ($this->_sections['slots']['show']) {
    $this->_sections['slots']['total'] = $this->_sections['slots']['loop'];
    if ($this->_sections['slots']['total'] == 0)
        $this->_sections['slots']['show'] = false;
} else
    $this->_sections['slots']['total'] = 0;
if ($this->_sections['slots']['show']):

            for ($this->_sections['slots']['index'] = $this->_sections['slots']['start'], $this->_sections['slots']['iteration'] = 1;
                 $this->_sections['slots']['iteration'] <= $this->_sections['slots']['total'];
                 $this->_sections['slots']['index'] += $this->_sections['slots']['step'], $this->_sections['slots']['iteration']++):
$this->_sections['slots']['rownum'] = $this->_sections['slots']['iteration'];
$this->_sections['slots']['index_prev'] = $this->_sections['slots']['index'] - $this->_sections['slots']['step'];
$this->_sections['slots']['index_next'] = $this->_sections['slots']['index'] + $this->_sections['slots']['step'];
$this->_sections['slots']['first']      = ($this->_sections['slots']['iteration'] == 1);
$this->_sections['slots']['last']       = ($this->_sections['slots']['iteration'] == $this->_sections['slots']['total']);
?>
                        <option <?php if ($this->_sections['slots']['iteration'] == 12): ?> selected="selected" <?php endif; ?>><?php echo $this->_sections['slots']['iteration']; ?>
</option>
                        <?php endfor; endif; ?>
                    </select>
                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Ilość osób, która może zostać zapisana na mecz.</div>
                </td>
            </tr>
            <tr>
                <td>Komentarz:</td>
                <td><textarea name="comment" cols="25" rows="5"></textarea>
                </td>
            </tr>
            <tr>
                <td>Powtórz mecz:
                </td>
                <td>
                    <select name="cycles">
                    <option>0</option>
                    <?php unset($this->_sections['cycles']);
$this->_sections['cycles']['name'] = 'cycles';
$this->_sections['cycles']['loop'] = is_array($_loop=12) ? count($_loop) : max(0, (int)$_loop); unset($_loop);
$this->_sections['cycles']['show'] = true;
$this->_sections['cycles']['max'] = $this->_sections['cycles']['loop'];
$this->_sections['cycles']['step'] = 1;
$this->_sections['cycles']['start'] = $this->_sections['cycles']['step'] > 0 ? 0 : $this->_sections['cycles']['loop']-1;
if ($this->_sections['cycles']['show']) {
    $this->_sections['cycles']['total'] = $this->_sections['cycles']['loop'];
    if ($this->_sections['cycles']['total'] == 0)
        $this->_sections['cycles']['show'] = false;
} else
    $this->_sections['cycles']['total'] = 0;
if ($this->_sections['cycles']['show']):

            for ($this->_sections['cycles']['index'] = $this->_sections['cycles']['start'], $this->_sections['cycles']['iteration'] = 1;
                 $this->_sections['cycles']['iteration'] <= $this->_sections['cycles']['total'];
                 $this->_sections['cycles']['index'] += $this->_sections['cycles']['step'], $this->_sections['cycles']['iteration']++):
$this->_sections['cycles']['rownum'] = $this->_sections['cycles']['iteration'];
$this->_sections['cycles']['index_prev'] = $this->_sections['cycles']['index'] - $this->_sections['cycles']['step'];
$this->_sections['cycles']['index_next'] = $this->_sections['cycles']['index'] + $this->_sections['cycles']['step'];
$this->_sections['cycles']['first']      = ($this->_sections['cycles']['iteration'] == 1);
$this->_sections['cycles']['last']       = ($this->_sections['cycles']['iteration'] == $this->_sections['cycles']['total']);
?>
                        <option><?php echo $this->_sections['cycles']['iteration']; ?>
</option>
                    <?php endfor; endif; ?>
                    </select>
                    <div class="help" onmouseover="$(this).next().show();" onmouseout="$(this).next().hide();" >?</div>
                    <div class="help_info">Wybranie tej opcji spowoduje dodanie tego meczu w kolejnych tygodniach.<br /> Każdy kolejny mecz zostanie dodany z tygodniowym przesunięciem.<br />Jeżeli chcesz dodać tylko aktualny mecz wybierz 0.</div>
                </td>
            </tr>
        </table>
        <div style="margin-left: 5px; color: red;">Aby zapisać zawodnika na mecz kliknij dwukrotnie zawodnika (kolejność ma znaczenie). </div>
        <table style="width: 984px;" cellpadding="5">
            <tr>
                <th>Dostępni zawodnicy</th>
                <th>Zawodnicy zapisani</th>
            </tr>
            <tr>
                <td>
                    <select id="users" Multiple size=15 style="width: 100%" title="Kliknij dwukrotnie na zawodniku aby zapisać.">
                    <?php $_from = $this->_tpl_vars['escore']['users']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['user'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['user']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['user']):
        $this->_foreach['user']['iteration']++;
?>
                        <option val="<?php echo $this->_tpl_vars['user']->essysus_login; ?>
"><?php echo $this->_tpl_vars['user']->essysus_login; ?>
</option>
                    <?php endforeach; endif; unset($_from); ?>
                    </select>
                </td>
                <td>
                    <select name="signedup_users[]" id="signedup_users" Multiple size=15 style="width: 100%;" title="Kliknij dwukrotnie na zawodniku aby wypisać."></select>
                </td>
            </tr>
            <tr style="text-align: center">
                <td colspan="2"><input id="submit_match" type="image" src="images/submit_button.jpg" /></td>
            </tr>
        </table>
    </fieldset>
</form>
<!--<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>-->