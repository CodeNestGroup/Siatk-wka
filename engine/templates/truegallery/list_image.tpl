{ $Interface->callModule('menu','showAdminMenu') }

        <script type="text/javascript">
            {literal}
            // Initially set opacity on thumbs and add
            // additional styling for hover effect on thumbs
            var onMouseOutOpacity = 0.67;
            $('#thumbs-adv ul.thumbs li').css('opacity', onMouseOutOpacity)
                    .hover(
                            function () {
                                    $(this).not('.selected').fadeTo('fast', 1.0);
                            },
                            function () {
                                    $(this).not('.selected').fadeTo('fast', onMouseOutOpacity);
                            }
                    );

            $(document).ready(function() {
                    // Initialize Advanced Galleriffic Gallery
                    var galleryAdv = $('#gallery-adv').galleriffic('#thumbs-adv', {
                            delay:                  4000,
                            numThumbs:              21,
                            preloadAhead:           10,
                            enableTopPager:         true,
                            enableBottomPager:      true,
                            imageContainerSel:      '#slideshow-adv',
                            controlsContainerSel:   '#controls-adv',
                            captionContainerSel:    '#caption-adv',
                            loadingContainerSel:    '#loading-adv',
                            renderSSControls:       true,
                            renderNavControls:      true,
                            playLinkText:           'Rozpocznij pokaz slajdów',
                            pauseLinkText:          'Zatrzymaj pokaz slajdów',
                            prevLinkText:           '&lsaquo; Poprzednie zdjęcie',
                            nextLinkText:           'Następne zdjęcie &rsaquo;',
                            nextPageLinkText:       '&rsaquo;',
                            prevPageLinkText:       '&lsaquo;',
                            enableHistory:          true,
                            autoStart:              false,
                            onChange:               function(prevIndex, nextIndex) {
                                    $('#thumbs-adv ul.thumbs').children()
                                            .eq(prevIndex).fadeTo('fast', onMouseOutOpacity).end()
                                            .eq(nextIndex).fadeTo('fast', 1.0);
                            },
                            onTransitionOut:        function(callback) {
                                    $('#slideshow-adv, #caption-adv').fadeOut('fast', callback);
                            },
                            onTransitionIn:         function() {
                                    $('#slideshow-adv, #caption-adv').fadeIn('fast');
                            },
                            onPageTransitionOut:    function(callback) {
                                    $('#thumbs-adv ul.thumbs').fadeOut('fast', callback);
                            },
                            onPageTransitionIn:     function() {
                                    $('#thumbs-adv ul.thumbs').fadeIn('fast');
                            }
                           
                    });


                    $('div.navigation').css({'width' : '280px', 'float' : 'left'});
                    // Initialize Minimal Galleriffic Gallery
                    var galleryMin = $('#gallery-min').galleriffic('#thumbs-min', {
                            imageContainerSel:      '#slideshow-min',
                            controlsContainerSel:   '#controls-min'
                    });
            });
            {/literal}
        </script>
        <div style="margin-left: 50px; width: 954px;">
            <a href="?module=truegallery&action=addimage_form&esgal_id=00000" style="margin-top: 20px; float: right; font-size: 14px; text-align: right; color: #3F69BF;" >Dodaj zdjęcie</a>
        </div>
        {if $escore.images_list}
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
                                            { foreach from=$escore.images_list item=img name="img"}
						<li>
							<a class="thumb" href="truegallery/{$img->esgal_id}/med{$img->esgimg_filename}">

								<img src="truegallery/{$img->esgal_id}/{$img->esgimg_mfilename}" alt="" />
							</a>
							<div class="caption">
								<div class="download">
									<a style="font-size: 10px;" href="truegallery/{$img->esgal_id}/{$img->esgimg_filename}">Pobierz zdjęcie w rozdzielczości [1024x768px]</a>
                                                                        { if $Interface->getCurrentUserRole()=='ADMINISTRATOR'}<span style="font-size: 8px">|</span> <span><a style="font-size: 10px; color:red;" onclick="return confirm('Czy napewno chcesz usunąć zdjęcie: {$img->esgimg_filename} ?')" href="?module=truegallery&amp;action=delimg&amp;esgimg_id={ $img->esgimg_id }">usuń</a>{/if}</span>
								</div>
                                                                <div style="clear: both"></div>
								<div class="image-desc">{$img->esgimg_desc}</div>
							</div>
						</li>
                                                {/foreach}
					</ul>
				</div>
				<!-- End Advanced Gallery Html Containers -->
             </div>
	</div>
    {/if}
{ include file=$smarty.const.ADMIN_FOOTER }