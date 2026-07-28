<?php /* Smarty version 2.6.17, created on 2018-11-07 07:27:17
         compiled from truegallery/list_image.tpl */ ?>
<?php echo $this->_tpl_vars['Interface']->callModule('menu','showAdminMenu'); ?>


        <script type="text/javascript">
            <?php echo '
            // Initially set opacity on thumbs and add
            // additional styling for hover effect on thumbs
            var onMouseOutOpacity = 0.67;
            $(\'#thumbs-adv ul.thumbs li\').css(\'opacity\', onMouseOutOpacity)
                    .hover(
                            function () {
                                    $(this).not(\'.selected\').fadeTo(\'fast\', 1.0);
                            },
                            function () {
                                    $(this).not(\'.selected\').fadeTo(\'fast\', onMouseOutOpacity);
                            }
                    );

            $(document).ready(function() {
                    // Initialize Advanced Galleriffic Gallery
                    var galleryAdv = $(\'#gallery-adv\').galleriffic(\'#thumbs-adv\', {
                            delay:                  4000,
                            numThumbs:              21,
                            preloadAhead:           10,
                            enableTopPager:         true,
                            enableBottomPager:      true,
                            imageContainerSel:      \'#slideshow-adv\',
                            controlsContainerSel:   \'#controls-adv\',
                            captionContainerSel:    \'#caption-adv\',
                            loadingContainerSel:    \'#loading-adv\',
                            renderSSControls:       true,
                            renderNavControls:      true,
                            playLinkText:           \'Rozpocznij pokaz slajdów\',
                            pauseLinkText:          \'Zatrzymaj pokaz slajdów\',
                            prevLinkText:           \'&lsaquo; Poprzednie zdjęcie\',
                            nextLinkText:           \'Następne zdjęcie &rsaquo;\',
                            nextPageLinkText:       \'&rsaquo;\',
                            prevPageLinkText:       \'&lsaquo;\',
                            enableHistory:          true,
                            autoStart:              false,
                            onChange:               function(prevIndex, nextIndex) {
                                    $(\'#thumbs-adv ul.thumbs\').children()
                                            .eq(prevIndex).fadeTo(\'fast\', onMouseOutOpacity).end()
                                            .eq(nextIndex).fadeTo(\'fast\', 1.0);
                            },
                            onTransitionOut:        function(callback) {
                                    $(\'#slideshow-adv, #caption-adv\').fadeOut(\'fast\', callback);
                            },
                            onTransitionIn:         function() {
                                    $(\'#slideshow-adv, #caption-adv\').fadeIn(\'fast\');
                            },
                            onPageTransitionOut:    function(callback) {
                                    $(\'#thumbs-adv ul.thumbs\').fadeOut(\'fast\', callback);
                            },
                            onPageTransitionIn:     function() {
                                    $(\'#thumbs-adv ul.thumbs\').fadeIn(\'fast\');
                            }
                           
                    });


                    $(\'div.navigation\').css({\'width\' : \'280px\', \'float\' : \'left\'});
                    // Initialize Minimal Galleriffic Gallery
                    var galleryMin = $(\'#gallery-min\').galleriffic(\'#thumbs-min\', {
                            imageContainerSel:      \'#slideshow-min\',
                            controlsContainerSel:   \'#controls-min\'
                    });
            });
            '; ?>

        </script>
        <div style="margin-left: 50px; width: 954px;">
            <a href="?module=truegallery&action=addimage_form&esgal_id=00000" style="margin-top: 20px; float: right; font-size: 14px; text-align: right; color: #3F69BF;" >Dodaj zdjęcie</a>
        </div>
        <?php if ($this->_tpl_vars['escore']['images_list']): ?>
        <div id="content" style="text-align: left; height: 800px; margin-left: 50px;">

          <div id="content_left2">
          	<div style="">
	            <h1 style="font-size: 20px;" class="title">Galeria</h1>
                </div>
          </div>
          <div>
  <!-- Start Advanced Gallery Html Containers -->

				<div id="gallery-adv" class="content">

					<div id="controls-adv" class="controls"></div>
					<div id="loading-adv" class="loader"></div>
					<div id="slideshow-adv" class="slideshow"></div>
					<div id="caption-adv" class="embox"></div>
				</div>
				<div id="thumbs-adv" class="navigation" >
					<ul class="thumbs noscript">
                                            <?php $_from = $this->_tpl_vars['escore']['images_list']; if (!is_array($_from) && !is_object($_from)) { settype($_from, 'array'); }$this->_foreach['img'] = array('total' => count($_from), 'iteration' => 0);
if ($this->_foreach['img']['total'] > 0):
    foreach ($_from as $this->_tpl_vars['img']):
        $this->_foreach['img']['iteration']++;
?>
						<li>
							<a class="thumb" href="truegallery/<?php echo $this->_tpl_vars['img']->esgal_id; ?>
/med<?php echo $this->_tpl_vars['img']->esgimg_filename; ?>
">

								<img src="truegallery/<?php echo $this->_tpl_vars['img']->esgal_id; ?>
/<?php echo $this->_tpl_vars['img']->esgimg_mfilename; ?>
" alt="" />
							</a>
							<div class="caption">
								<div class="download">
									<a style="font-size: 10px;" href="truegallery/<?php echo $this->_tpl_vars['img']->esgal_id; ?>
/<?php echo $this->_tpl_vars['img']->esgimg_filename; ?>
">Pobierz zdjęcie w rozdzielczości [1024x768px]</a>
                                                                        <?php if ($this->_tpl_vars['Interface']->getCurrentUserRole() == 'ADMINISTRATOR'): ?><span style="font-size: 8px">|</span> <span><a style="font-size: 10px; color:red;" onclick="return confirm('Czy napewno chcesz usunąć zdjęcie: <?php echo $this->_tpl_vars['img']->esgimg_filename; ?>
 ?')" href="?module=truegallery&amp;action=delimg&amp;esgimg_id=<?php echo $this->_tpl_vars['img']->esgimg_id; ?>
">usuń</a><?php endif; ?></span>
								</div>
                                                                <div style="clear: both"></div>
								<div class="image-desc"><?php echo $this->_tpl_vars['img']->esgimg_desc; ?>
</div>
							</div>
						</li>
                                                <?php endforeach; endif; unset($_from); ?>
					</ul>
				</div>
				<!-- End Advanced Gallery Html Containers -->
             </div>
	</div>
    <?php endif; ?>
<!--<?php $_smarty_tpl_vars = $this->_tpl_vars;
$this->_smarty_include(array('smarty_include_tpl_file' => @ADMIN_FOOTER, 'smarty_include_vars' => array()));
$this->_tpl_vars = $_smarty_tpl_vars;
unset($_smarty_tpl_vars);
 ?>-->