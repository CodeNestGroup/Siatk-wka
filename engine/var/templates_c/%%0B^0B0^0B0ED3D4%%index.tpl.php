<?php /* Smarty version 2.6.17, created on 2025-04-02 14:08:59
         compiled from layout/index.tpl */ ?>
<?php require_once(SMARTY_CORE_DIR . 'core.load_plugins.php');
smarty_core_load_plugins(array('plugins' => array(array('modifier', 'date_format', 'layout/index.tpl', 23, false),)), $this); ?>
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


<div class="baner" style="width:90%; margin: 0 auto;"><a href="https://ecomagia.raypath.info/Products/Details?id=306" target="_blank"><img src="/images/Baner podłużny.jpg" style="width:100%; padding-top: 2%;"></a></div>
<!-- przełacznik shop/content tutaj był -->
<script type="text/javascript" src="js/advajax.js"></script>
<div class="above" id="comment_window">
<div id="closebutton" class="closebutton" onclick="closeComment()" title="zamknij"></div>
<div style="clear: both;"></div>
<table style="margin-left: 10px;">
        <tr>
                <td colspan="2"><div style="color:white;">Komentarz: </div><td>
        </tr>
        <tr>
                <td colspan="2">
                        <textarea id="escom_desc" style="float: left;" cols="39" rows="6" wrap="OFF" maxlength="250"></textarea>
                </td>
        </tr>
        <tr>
                <td align="center" colspan="2">
                    <div class="comment_submit" id="comment" onclick="saveComment()" title="potwierdź" ></div>
                </td>
        </tr>
        <div id="img_id" value=""></div>
</table>
</div>
<div class="above" id="getcomment_window"></div>
<div>

</div>
<?php if ($this->_tpl_vars['message']): ?>
<div style="color: red; text-align: center; margin-top: 40px;"><?php echo $this->_tpl_vars['message']; ?>
</div>
<?php endif; ?>



<!-- ----------------------------------------- -->
<?php $this->assign('matches', $this->_tpl_vars['Interface']->callModule('match','showmatches')); ?>
<div style=""></div>
<?php if ($this->_tpl_vars['matches']['comming_match']): ?>
<table border="0" cellspacing="0" cellpadding="5" class="table">
     <tr class="table_header">
         <th colspan="4" class="fleft lright" style="color: red;" >Najbliższe dostępne spotkanie</th>
     </tr>
     <tr class="table_header">
         <th class="fleft">Dzień</th>
         <th>Godzina</th>
         <th>Miejsc</th>
         <th class="lright">Opercje</th>
     </tr>
     <tr class="table_row2">
            <td class="fleft"><?php echo $this->_tpl_vars['matches']['comming_match']['esmat_matchdate']; ?>
</td>
            <td style="text-align: center;"><?php echo ((is_array($_tmp=$this->_tpl_vars['matches']['comming_match']['esmat_matchbegintime'])) ? $this->_run_mod_handler('date_format', true, $_tmp, "%H:%M") : smarty_modifier_date_format($_tmp, "%H:%M")); ?>
&nbsp;-&nbsp;<?php echo ((is_array($_tmp=$this->_tpl_vars['matches']['comming_match']['esmat_matchendtime'])) ? $this->_run_mod_handler('date_format', true, $_tmp, "%H:%M") : smarty_modifier_date_format($_tmp, "%H:%M")); ?>
</td>
            <td style="text-align: center;"><?php echo $this->_tpl_vars['matches']['comming_match']['esmat_usedslots']; ?>
/<?php echo $this->_tpl_vars['matches']['comming_match']['esmat_slots']; ?>
</td>
            <td class="lright">
                <a class="link" href="?module=match&action=matchdetails&id=<?php echo $this->_tpl_vars['matches']['comming_match']['esmat_id']; ?>
">Szczegóły</a>
            </td>
     </tr>
 </table>
<?php endif; ?>
<table border="0" cellspacing="0" cellpadding="5" class="table">
    <tr class="table_header">
        <!--<td style="width: 80px;">Id</td>-->
        <th class="fleft">Dzień</th>
        <th>Godzina</th>
        <th>Miejsc</th>
        <th>Ocena spotkania</th>
        <?php if ($_SESSION['admin']['esurole_id'] == 'ZAWODNIK'): ?><th>Twoja ocena</th><?php endif; ?>
        <th class="lright">Operacje</th>
    </tr>
	<?php $_from = $this->_tpl_vars['matches']['matches_list']['items']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['match'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['match']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['match']):
        $this->_foreach['match']['iteration']++;
?>
         <tr <?php if ($this->_foreach['match']['iteration']%2): ?> class="table_row"<?php else: ?> class="table_row3"<?php endif; ?>>
            <td class="fleft"><?php if ($this->_tpl_vars['match']->esmat_locked == 1): ?><img src="images/lock_closed.png" /><?php endif; ?><?php echo $this->_tpl_vars['match']->esmat_matchdate; ?>
</td>
            <td style="text-align: center;"><?php echo ((is_array($_tmp=$this->_tpl_vars['match']->esmat_matchbegintime)) ? $this->_run_mod_handler('date_format', true, $_tmp, "%H:%M") : smarty_modifier_date_format($_tmp, "%H:%M")); ?>
&nbsp;-&nbsp;<?php echo ((is_array($_tmp=$this->_tpl_vars['match']->esmat_matchendtime)) ? $this->_run_mod_handler('date_format', true, $_tmp, "%H:%M") : smarty_modifier_date_format($_tmp, "%H:%M")); ?>
</td>
            <td style="text-align: center;"><?php echo $this->_tpl_vars['match']->esmat_usedslots; ?>
/<?php echo $this->_tpl_vars['match']->esmat_slots; ?>
</td>
            <td>
                <?php if ($this->_tpl_vars['match']->esmat_rate > 0.5): ?>
                    <div class="gallery_star2_blue"></div>
                <?php else: ?>
                    <div class="gallery_star_blue"></div>
                <?php endif; ?>
                <?php if ($this->_tpl_vars['match']->esmat_rate > 1.5): ?>
                    <div class="gallery_star2_blue"></div>
                <?php else: ?>
                    <div class="gallery_star_blue"></div>
                <?php endif; ?>
                <?php if ($this->_tpl_vars['match']->esmat_rate > 2.5): ?>
                    <div class="gallery_star2_blue"></div>
                <?php else: ?>
                    <div class="gallery_star_blue"></div>
                <?php endif; ?>
                <?php if ($this->_tpl_vars['match']->esmat_rate > 3.5): ?>
                    <div class="gallery_star2_blue"></div>
                <?php else: ?>
                    <div class="gallery_star_blue"></div>
                <?php endif; ?>
                <?php if ($this->_tpl_vars['match']->esmat_rate > 4.5): ?>
                    <div class="gallery_star2_blue"></div>
                <?php else: ?>
                    <div class="gallery_star_blue"></div>
                <?php endif; ?>
            </td>
            <?php if ($_SESSION['admin']['esurole_id'] == 'ZAWODNIK'): ?>
            <td>
            <?php if ($_SESSION['admin']['esurole_id'] == 'ZAWODNIK' && $this->_tpl_vars['match']->esmat_locked == 1): ?>
                    <?php if ($this->_tpl_vars['match']->esmat_yourrate == ''): ?>
                            <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
" style="display: none;"></div>
                            <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_1" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_2" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_3" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_4" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>
                            <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_5" class="gallery_star" onmouseover="enable_star(id); " onmouseout="disable_star(id)" onclick="vote(id)"></div>

                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
1" class="gallery_star2" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
20" class="gallery_star" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
2" class="gallery_star2" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
30" class="gallery_star" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
3" class="gallery_star2" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
40" class="gallery_star" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
4" class="gallery_star2" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
50" class="gallery_star" style="display: none;"></div>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
5" class="gallery_star2" style="display: none;"></div>

                            <?php if ($this->_tpl_vars['match']->esmat_yourrate == $this->_tpl_vars['match']->esmat_id): ?>
                            <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
1" class="gallery_star2"></div>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate < 2): ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
2" class="gallery_star"></div>
                            <?php else: ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
2" class="gallery_star2"></div>
                            <?php endif; ?>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate < 3): ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
3" class="gallery_star"></div>
                            <?php else: ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
3" class="gallery_star2"></div>
                            <?php endif; ?>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate < 4): ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
4" class="gallery_star"></div>
                            <?php else: ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
4" class="gallery_star2"></div>
                            <?php endif; ?>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate < 5): ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
5" class="gallery_star"></div>
                            <?php else: ?>
                                    <div id="<?php echo $this->_tpl_vars['match']->esmat_id; ?>
5" class="gallery_star2"></div>
                            <?php endif; ?>
                            <script type="text/javascript">
                                    document.getElementById('<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_1').className='gallery_star_unvisible';
                                    document.getElementById('<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_2').className='gallery_star_unvisible';
                                    document.getElementById('<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_3').className='gallery_star_unvisible';
                                    document.getElementById('<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_4').className='gallery_star_unvisible';
                                    document.getElementById('<?php echo $this->_tpl_vars['match']->esmat_id; ?>
_5').className='gallery_star_unvisible';
                            </script>
                            <?php endif; ?>
                    <?php else: ?>
                             <?php if ($this->_tpl_vars['match']->esmat_yourrate > 0.5): ?>
                                <div style="cursor: default;" class="gallery_star2"></div>
                            <?php else: ?>
                                <div style="cursor: default;" class="gallery_star"></div>
                            <?php endif; ?>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate > 1.5): ?>
                                <div style="cursor: default;" class="gallery_star2"></div>
                            <?php else: ?>
                                <div style="cursor: default;" class="gallery_star"></div>
                            <?php endif; ?>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate > 2.5): ?>
                                <div style="cursor: default;" class="gallery_star2"></div>
                            <?php else: ?>
                                <div style="cursor: default;" class="gallery_star"></div>
                            <?php endif; ?>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate > 3.5): ?>
                                <div style="cursor: default;" class="gallery_star2"></div>
                            <?php else: ?>
                                <div style="cursor: default;" class="gallery_star"></div>
                            <?php endif; ?>
                            <?php if ($this->_tpl_vars['match']->esmat_yourrate > 4.5): ?>
                                <div style="cursor: default;" class="gallery_star2"></div>
                            <?php else: ?>
                                <div style="cursor: default;" class="gallery_star"></div>
                            <?php endif; ?>
                    <?php endif; ?>
                     <?php else: ?>
                     <div style="font-size: 10px">Niedostępna</div>
                <?php endif; ?>
            </td>
            <?php endif; ?>
            <td class="lright">
                <a class="link" href="?module=match&action=matchdetails&id=<?php echo $this->_tpl_vars['match']->esmat_id; ?>
">Szczegóły</a>
						<?php if ($this->_tpl_vars['match']->esmat_comment != null): ?><img class="info" src="/images/koperta.png" /><?php endif; ?>

                                        <!--<?php echo '| <div id="{$match->esmat_id}" style="color: rgb(0, 113, 206); cursor: pointer; display: inline;"  onclick="alert(\'Zaloguj się najpierw aby skomentować to spotkanie.\')"><strong>Dodaj komentarz</strong></div>
                {if $match->esmat_commentsnumber neq 0 }&nbsp;| <div id="commentslist_{$match->esmat_id}" style="color: rgb(0, 113, 206); cursor: pointer; display: inline;"  onclick="getComments(id)"><strong>Komentarze[{$match->esmat_commentsnumber}]</strong></div>{/if}
                                        '; ?>
-->
            </td>
         </tr>
	<?php endforeach; endif; unset($_from); ?>
    <tr>
</table>
<table>
    <tr><td colspan="13" style="padding-left: 40px;">
                <div id="pages">
                        <?php if ($this->_tpl_vars['matches']['prevfrom'] != FALSE): ?>
                        <a class="prevnext" href="?module=match&amp;action=showmatches2&amp;from=<?php echo $this->_tpl_vars['matches']['prevfrom']-1; ?>
"><< poprzednia </a> |
                        <?php endif; ?>
                        <?php $_from = $this->_tpl_vars['matches']['page']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['page'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['page']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['key'] => $this->_tpl_vars['page']):
        $this->_foreach['page']['iteration']++;
?>
                        <a <?php if ($this->_tpl_vars['page']['active'] == TRUE): ?> class="activepagetrue"  <?php else: ?> class="activepagefalse" <?php endif; ?>href="?module=match&amp;action=showmatches2&amp;from=<?php echo $this->_tpl_vars['page']['from']-1; ?>
"><?php echo $this->_tpl_vars['page']['iter']; ?>
</a> |
                        <?php endforeach; endif; unset($_from); ?>
                        <?php if ($this->_tpl_vars['matches']['nextfrom'] != FALSE): ?>
                        <a class="prevnext" href="?module=match&amp;action=showmatches2&amp;from=<?php echo $this->_tpl_vars['matches']['nextfrom']-1; ?>
"> następna >> </a>
                        <?php endif; ?>
                </div>
       </td></tr>
</table>
<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>