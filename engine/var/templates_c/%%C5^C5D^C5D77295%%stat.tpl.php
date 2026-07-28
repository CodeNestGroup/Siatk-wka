<?php /* Smarty version 2.6.17, created on 2018-09-17 15:11:41
         compiled from match/stat.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>

<div style="margin-top: 40px"></div>
<table border="0" cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <th class="fleft">Zawodnik</th>
        <th>Wygrane</th>
        <th>Przegrane</th>
        <th>Rozegranych meczy</th>
        <th class="lright">Skuteczność</th>
    </tr>
	<?php $_from = $this->_tpl_vars['escore']['stat']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['s'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['s']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['s']):
        $this->_foreach['s']['iteration']++;
?>
         <tr class="table_row">
            <td class="fleft"><?php echo $this->_tpl_vars['s']->essysus_login; ?>
</td>
            <td style="text-align: center;"><?php echo $this->_tpl_vars['s']->won; ?>
</td>
            <td style="text-align: center;"><?php echo $this->_tpl_vars['s']->lose; ?>
</td>
            <td style="text-align: center;"><?php echo $this->_tpl_vars['s']->total; ?>
</td>
            <td style="text-align: center;" class="lright"><?php echo $this->_tpl_vars['s']->percentage; ?>
%</td>
         </tr>
	<?php endforeach; endif; unset($_from); ?>
    <tr>
</table>
<!--<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>-->