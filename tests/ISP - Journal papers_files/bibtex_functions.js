bibtex_reader = new BibtexDisplay()
constraints = {};

function add_handler(entry, value) {
  // console.log('redo ' + entry + '  ' + value);
  $(".bibtex_template").hide();
  if (value == 'all') delete constraints[entry];
  else constraints[entry] = value;
  bibtex_reader.displayBibtex($("#bibtex_input").val(), $("#bibtex_display"), constraints);
  if (typeof _altmetric != 'undefined') _altmetric.embed_init();
}

/*
To add a dropdown menu insert this code in the html and uncomment the dropbox code bellow
Projects: <select class="pselect">
  <option selected value="all">All</option>
</select>
*/

function add_projects() {
  projects = bibtex_reader.get_projects($("#bibtex_input").val(), constraints);
  var n = 0;
  $.each(projects, function (key, value) {
    // Add buttons
    $('.projects').append('<button class="btn btn-normal btn-projects" type="button" value="'
      + key + '">' + key + ' <span class="badge">' + value + '</span></button>');
    // Add dropdown options
    // $('.pselect').append('<option value="'  + key + '">' + key + ' (' + value + ')</option>');
    n++;
  });
  // No projects found, return
  if (n == 0) return;
  // Add handlers
  $('.btn-projects').click(function() {
    add_handler('PROJECT', $(this).val());
  });
  // $('.pselect').change(function() {
  //   add_handler('PROJECT', $(this).val());
  // });
  // Show controls
  //$('.projects').toggleClass('hide');
  $('.projects').removeClass('hide');
}

function add_years() {
  years = bibtex_reader.get_years($("#bibtex_input").val(), constraints);
  var n = 0;
  $.each(years, function (key, value) {
    $('.years').append('<button class="btn btn-primary btn-years" type="button" value="'
      + key + '"> ' + key + ' <span class="badge">' + value + '</span></button>');
    n++;
  });
  // No years found, return
  if (n == 0) return;
  // Add handlers
  $('.btn-years').click(function() {
    add_handler('YEAR', $(this).val());
  });
  // Show controls
  $('.years').removeClass('hide');
}

function my_bibtex_js_draw() {
  // year = "all"
  $(".bibtex_template").hide();
  bibtex_reader.displayBibtex($("#bibtex_input").val(), $("#bibtex_display"), constraints);
  // Add filtering buttons / dropdowns
  add_years();
  add_projects();
}
