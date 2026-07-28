<?php /* Smarty version 2.6.17, created on 2018-09-17 15:11:41
         compiled from menu/admin_menu.tpl */ ?>
<?php require_once(SMARTY_CORE_DIR . 'core.load_plugins.php');
smarty_core_load_plugins(array('plugins' => array(array('modifier', 'date_format', 'menu/admin_menu.tpl', 22, false),)), $this); ?>
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
</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Jesteś zalogowany jako: <strong><?php echo $this->_tpl_vars['Interface']->getCurrentUser(); ?>
</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    <a style="color: red;" href="?module=users&amp;action=logout">wyloguj</a>
    </div>
    <div id="menu" style="padding-top: 123px; margin-left: 50px;">
        <div>
            <div class="men_itm1<?php if ($this->_tpl_vars['menu'] == 'userslist' || $this->_tpl_vars['menu'] == 'edituser_form' || $this->_tpl_vars['menu'] == 'edituser_form'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="?module=users&action=userslist">Zawodnicy</a></strong></div>
            <?php if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR'): ?><div class="men_itm2<?php if ($this->_tpl_vars['menu'] == 'adduser_form' || $this->_tpl_vars['menu'] == 'adduser'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="?module=users&action=adduser_form">Nowy<br />zawodnik</a></strong></div><?php endif; ?>
            <div class="men_itm1<?php if ($this->_tpl_vars['menu'] == 'showmatches' || $this->_tpl_vars['menu'] == 'matchdetails'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="?module=match&action=showmatches">Mecze</a></strong></div>
            <?php if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR'): ?><div class="men_itm1<?php if ($this->_tpl_vars['menu'] == 'addmatch'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="?module=match&action=addmatch">Nowy mecz</a></strong></div><?php endif; ?>
            <div class="men_itm1<?php if ($this->_tpl_vars['menu'] == 'showstat'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="?module=match&action=showstat">Statystyki</a></strong></div>
            <div class="men_itm1<?php if ($this->_tpl_vars['menu'] == 'showimageslist'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="galeria.html">Galeria</a></strong></div>
            <?php if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR'): ?><div class="men_itm1<?php if ($this->_tpl_vars['menu'] == 'systempref_form'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="?module=system&action=systempref_form">Ustawienia</a></strong></div><?php endif; ?>
            <?php if ($_SESSION['admin']['esurole_id'] == 'ADMINISTRATOR'): ?><div class="men_itm2<?php if ($this->_tpl_vars['menu'] == 'phpmybackup'): ?>_b<?php endif; ?>"><strong><a style="color: white; text-decoration: none; "href="?module=system&action=phpmybackup">Kopia<br />zapasowa</a></strong></div><?php endif; ?>
        </div>
    </div>
</div>


<!-- przełacznik shop/content tutaj był -->

<div>

</div>
<?php if ($this->_tpl_vars['message']): ?>
<div style="margin-left: 40px; color: red; text-align: center; margin-top: 40px;"><?php echo $this->_tpl_vars['message']; ?>
</div>
<?php endif; ?>
<!-- admin menu end -->