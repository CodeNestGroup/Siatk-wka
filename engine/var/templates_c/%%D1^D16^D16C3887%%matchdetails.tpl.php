<?php /* Smarty version 2.6.17, created on 2018-09-17 16:40:43
         compiled from match/matchdetails.tpl */ ?>
<?php require_once(SMARTY_CORE_DIR . 'core.load_plugins.php');
smarty_core_load_plugins(array('plugins' => array(array('modifier', 'date_format', 'match/matchdetails.tpl', 13, false),)), $this); ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<div style="margin-top: 40px" ></div>
<table cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th colspan="2">Szczegóły spotkania</th>		
    </tr>  
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Data spotkania:</td>
        <td class="lright"><?php echo $this->_tpl_vars['escore']['match']['esmat_matchdate']; ?>
</td>
    </tr>
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Godzina:</td>
        <td class="lright"><?php echo ((is_array($_tmp=$this->_tpl_vars['escore']['match']['esmat_matchbegintime'])) ? $this->_run_mod_handler('date_format', true, $_tmp, "%H:%M") : smarty_modifier_date_format($_tmp, "%H:%M")); ?>
 - <?php echo ((is_array($_tmp=$this->_tpl_vars['escore']['match']['esmat_matchendtime'])) ? $this->_run_mod_handler('date_format', true, $_tmp, "%H:%M") : smarty_modifier_date_format($_tmp, "%H:%M")); ?>
</td>
    </tr>
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Liczba miejsc:</td>
        <td class="lright"><?php echo $this->_tpl_vars['escore']['signedUpPlayersCounter']; ?>
/<?php echo $this->_tpl_vars['escore']['match']['esmat_slots']; ?>
</td>
    </tr>
    <?php if ($this->_tpl_vars['escore']['userrole'] == 'ZAWODNIK' && $this->_tpl_vars['escore']['match']['esmat_fulllocked'] == 0): ?>
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Zapisy:</td>
        <td class="lright">
            <?php if ($this->_tpl_vars['escore']['issignedup'] == 0): ?>
            <?php if ($this->_tpl_vars['escore']['match']['esmat_fulllocked'] == 0): ?>
                <a class="glink" href="?module=match&action=signin&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $_SESSION['admin']['essysus_login']; ?>
">
                        Kliknij aby się zapisać
                </a>
            <?php endif; ?>
            <?php else: ?>
            <?php if ($this->_tpl_vars['escore']['match']['esmat_locked'] == 0): ?>
                <a class="rlink" href="?module=match&action=signout&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $_SESSION['admin']['essysus_login']; ?>
" onclick="return confirm('Potwierdź wypisanie się klikając OK. Jeżeli zapiszesz się ponownie zostaniesz umieszcony na końcu listy!')">
                    Kliknij aby się wypisać
                </a>
            <?php else: ?>
                Nie można się już wypisać!
            <?php endif; ?>
            <?php endif; ?></td>
    </tr>
    <?php endif; ?>
	<?php if ($this->_tpl_vars['escore']['userrole'] <= 'ZAWODNIK'): ?>
	<tr class="table_row">
		<td class="fleft lright" colspan="2">
			<form action="?module=match&action=addcomment" method="post">
				<input type="hidden" name="id_match" value="<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
"/>
				Napisz wiadomość: <input type="text" name="comment" value=""/>
				<input type="submit" name="addcomment" value="Wyślij"/>
			</form>	
		</td>	
	</tr>
	<?php endif; ?>
    <?php if ($this->_tpl_vars['escore']['match']['esmat_comment']): ?>
    <tr class="table_row">
        <td  class="fleft lright" colspan="2" ><?php echo $this->_tpl_vars['escore']['match']['esmat_comment']; ?>
</td>
    </tr>
    <?php endif; ?>
    <tr class="table_row">
        <td  style="color: red;" class="fleft lright" colspan="2" ><strong style="color: red;">Uwaga!</strong> Możliwość wypisania jest blokowana na 2 godziny przed rozpoczęciem spotkania. Zapisać się można do ostatniej minuty przed meczem.</td>
    </tr>
    <tr class="table_row">
        <td style="color: red;"  class="fleft lright" colspan="2">
            Jeżeli zawodnik, który jest zapisany na mecz nie wypisze się z meczu, a nie przyjdzie na mecz, musi uiścić opłatę 10zł ( normalnie jakby był).
        </td>
    </tr>
    <tr class="table_row">
        <td style="color: red;"  class="fleft lright" colspan="2">
            Jest bowiem blokowane miejsce dla tego zawodnika.
        </td>
    </tr>
    <?php if ($this->_tpl_vars['escore']['match']['esmat_locked'] == 1): ?>
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">
            Administracja:
        </td>
        <td class="lright">
            <a class="link" href="?module=match&action=addMatchResults&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
">Wyniki meczu</a>
        </td>
    </tr>
    <?php endif; ?>
</table>
<?php if ($this->_tpl_vars['escore']['players']): ?>
<table cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th colspan="3"><?php if ($this->_tpl_vars['escore']['match']['esmat_locked']): ?>Uczestnicy spotkania<?php else: ?>Zawodnicy zapisani na mecz <?php endif; ?></th>
    </tr>    
    <?php $_from = $this->_tpl_vars['escore']['players']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['p'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['p']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['p']):
        $this->_foreach['p']['iteration']++;
?>
       <?php if ($this->_foreach['p']['iteration'] > $this->_tpl_vars['escore']['match']['esmat_slots']): ?>
        <tr class="table_row">
            <td class="fleft d_firstcell"><?php echo $this->_foreach['p']['iteration']; ?>
.</td>
            <td class="d_secondcell"><?php echo $this->_tpl_vars['p']->essysus_login; ?>
</td>
            <td class="lright"><?php if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR' && $this->_tpl_vars['escore']['match']['esmat_locked'] == 0): ?><a class="rlink" href="?module=match&action=signout&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $this->_tpl_vars['p']->essysus_login; ?>
">Wypisz</a><?php endif; ?></td>
        </tr>
       <?php else: ?>
        <tr class="table_row">
            <td class="fleft d_firstcell"><?php echo $this->_foreach['p']['iteration']; ?>
.</td>
            <td class="d_secondcell"><strong><?php echo $this->_tpl_vars['p']->essysus_login; ?>
</strong></td>
            <td class="lright"><?php if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR' && $this->_tpl_vars['escore']['match']['esmat_locked'] == 0): ?><a class="rlink" href="?module=match&action=signout&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $this->_tpl_vars['p']->essysus_login; ?>
">Wypisz</a><?php endif; ?><?php if ($this->_tpl_vars['escore']['match']['esmat_locked'] == 1): ?><?php if ($this->_tpl_vars['p']->esmus_matchresult == 'loser'): ?><img style="width: 18px; float: left;" src="images/emoticon_unhappy.png" /><?php endif; ?><?php if ($this->_tpl_vars['p']->esmus_matchresult == 'winner'): ?><img style="width: 18px;" src="images/emoticon_smile.png" /><?php endif; ?><?php endif; ?></td>
        </tr>
        <?php endif; ?>
          <?php if ($this->_foreach['p']['iteration'] == $this->_tpl_vars['escore']['match']['esmat_slots']): ?>
        <tr class="table_header">
            <th colspan="3">Zawodnicy rezerwowi</th>
        </tr>
       <?php endif; ?>
    <?php endforeach; endif; unset($_from); ?>
</table>
<?php endif; ?>
<?php if (! $this->_tpl_vars['escore']['match']['esmat_fulllocked']): ?>
<?php if ($this->_tpl_vars['escore']['notSignedUpPlayers']): ?>
<table cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th colspan="3">Zawodnicy niezapisani na mecz</th>
    </tr>
    <?php $_from = $this->_tpl_vars['escore']['notSignedUpPlayers']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['nsp'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['nsp']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['nsp']):
        $this->_foreach['nsp']['iteration']++;
?>
        <tr class="table_row">
            <td class="fleft d_firstcell"><?php echo $this->_foreach['nsp']['iteration']; ?>
.</td>
            <td class="d_secondcell"><?php echo $this->_tpl_vars['nsp']->essysus_login; ?>
</td>
            <td class="lright"><?php if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR' && $this->_tpl_vars['escore']['match']['esmat_fulllocked'] == 0): ?><a class="glink" href="?module=match&action=signin&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $this->_tpl_vars['nsp']->essysus_login; ?>
">Zapisz</a><?php endif; ?></td>
        </tr>
    <?php endforeach; endif; unset($_from); ?>
</table>
<?php endif; ?>
<?php endif; ?>
<!--<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>-->