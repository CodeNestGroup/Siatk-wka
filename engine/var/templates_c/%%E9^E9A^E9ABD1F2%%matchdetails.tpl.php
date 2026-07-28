<?php /* Smarty version 2.6.17, created on 2018-09-17 15:30:40
         compiled from layout/matchdetails.tpl */ ?>
<?php require_once(SMARTY_CORE_DIR . 'core.load_plugins.php');
smarty_core_load_plugins(array('plugins' => array(array('modifier', 'date_format', 'layout/matchdetails.tpl', 22, false),)), $this); ?>
<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => "layout/includes/begin_site.tpl", 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>
<?php echo '
<script type="text/javascript">
// <![CDATA[
	function show_sub(id,total){
		document.getElementById(\'div_menu_\'+id).style.display=\'block\';
	}

	function hide_sub(total){
		for(i=1;i<=total;i++){
			document.getElementById(\'div_menu_\'+i).style.display=\'none\';
		}
	}

// ]]>
</script>
'; ?>

<!-- admin menu begin-->
<div id="outer_container">
    <div id="inner_container">
<div id="header">
    <div id="header_text">Dzisiaj jest: <strong><?php echo ((is_array($_tmp=time())) ? $this->_run_mod_handler('date_format', true, $_tmp, "%Y-%m-%d") : smarty_modifier_date_format($_tmp, "%Y-%m-%d")); ?>
</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a style="color: red;" href="/admin">zaloguj</a>
    </div>
</div>


<!-- przełacznik shop/content tutaj był -->
<div>

</div>
<?php if ($this->_tpl_vars['message']): ?>
<div style="margin-left: 40px; color: red; text-align: center; margin-top: 40px;"><?php echo $this->_tpl_vars['message']; ?>
</div>
<?php endif; ?>
<div style="margin-left: 50px; font-size: 14px; margin-top: 20px; width: 954px; text-align: center; " class="link"><span style="cursor: pointer;" onclick="history.back()">Powrót do meczy</span></div>
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
    <?php if ($this->_tpl_vars['escore']['userrole'] == 'ZAWODNIK' && $this->_tpl_vars['escore']['match']['esmat_locked'] == 0): ?>
    <tr class="table_row">
        <td style="width: 150px;" class="fleft">Zapisy:</td>
        <td class="lright">
            <?php if ($this->_tpl_vars['escore']['issignedup'] == 0): ?>
                <a class="glink" href="?module=match&action=signin&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $_SESSION['admin']['essysus_login']; ?>
">
                        Kliknij aby się zapisać
                </a>
            <?php else: ?>
                <a class="rlink" href="?module=match&action=signout&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $_SESSION['admin']['essysus_login']; ?>
" onclick="return confirm('Potwierdź wypisanie się klikając OK. Jeżeli zapiszesz się ponownie zostaniesz umieszcony na końcu listy!')">
                    Kliknij aby się wypisać
                </a>
            <?php endif; ?></td>
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
    </td
</table>

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
</strong></td>
            <td class="lright"><?php if ($this->_tpl_vars['escore']['match']['esmat_locked'] == 0): ?><a class="rlink" href="?module=match&action=signout&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $this->_tpl_vars['p']->essysus_login; ?>
">Wypisz</a><?php endif; ?></td>
        </tr>
       <?php else: ?>
        <tr class="table_row">
            <td class="fleft d_firstcell"><?php echo $this->_foreach['p']['iteration']; ?>
.</td>
            <td class="d_secondcell"><strong><?php echo $this->_tpl_vars['p']->essysus_login; ?>
</strong></td>
            <td class="lright"><?php if ($this->_tpl_vars['escore']['match']['esmat_locked'] == 0): ?><a class="rlink" href="?module=users&action=adminmode&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $this->_tpl_vars['p']->essysus_login; ?>
&type=signout">Wypisz</a><?php endif; ?></td>
        </tr>
        <?php endif; ?>
          <?php if ($this->_foreach['p']['iteration'] == $this->_tpl_vars['escore']['match']['esmat_slots']): ?>
        <tr class="table_header">
            <th colspan="3">Zawodnicy rezerwowi</th>
        </tr>
       <?php endif; ?>
    <?php endforeach; endif; unset($_from); ?>
</table>

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
            <td class="lright"><?php if ($this->_tpl_vars['escore']['match']['esmat_fulllocked'] == 0): ?><a class="glink" href="?module=users&action=adminmode&id=<?php echo $this->_tpl_vars['escore']['match']['esmat_id']; ?>
&login=<?php echo $this->_tpl_vars['nsp']->essysus_login; ?>
&type=signin">Zapisz</a><?php endif; ?></td>
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