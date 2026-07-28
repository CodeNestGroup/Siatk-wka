{ $Interface->callModule('menu','showAdminMenu') }
	<script type="text/javascript" src="js/datapicker/datapicker.js"></script>	
	<link rel="stylesheet" href="js/datapicker/datapicker.css" type="text/css" media="screen" />
	<form action="?module=truegallery&amp;action=addimage" name="edit_metadata" method="post" enctype="multipart/form-data">

        <fieldset>
            <legend>
                Dodaj zdjęcie do galerii
            </legend>
            <table cellpadding="5" cellspacing="0" border="0">
                <tr>
                    <td style="width: 120px;">Zdjęcie:<span style="color: red;">*</span></td>
                    <td class="a_inputtext"><input name="file" type="file" id="file" /></td>
                </tr>
                <tr>
                    <td>Opis</td>
                    <td><textarea rows="3" cols="25" name="esgimg_desc">{if $escore.if_error.esgimg_desc}{$escore.if_error.esgimg_desc}{else}{$escore.esgimg_desc}{/if}</textarea></td>
                </tr>
                <tr>
                    <td colspan="2">
                        Pola oznaczone * są wymagane. Maksymalny rozmiar zdjęcia nie może przekroczyć {$escore.max_img_size}.
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: center;"><input type="submit" name="submit_save_article" value="Zapisz" /></td>
                </tr>
            </table>
            <input type="hidden" value="1" name="esgimg_active" />
            <input type="hidden" value="00000" name="esgal_id" />
            <input type="hidden" name="esgimg_position" value="0" />
        </fieldset>
        </form>

{ include file=$smarty.const.ADMIN_FOOTER }