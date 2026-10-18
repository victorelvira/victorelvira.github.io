// Version and build stamp (CONVENTIONS.md section 3). Bump DATA_V and the ?v= tags in nyc.html together.
const DATA_V = "0.3.7";

// "is the 86th edition", or, for 1939, why it has no number.
function editionText(year, verb) {
  if (year === 1939) return "The concert of 31 December 1939 came before the numbered series: the Vienna Philharmonic counts 1 January 1941 as its 1st New Year's Concert. ";
  return "The New Year's Concert " + year + " " + verb + " the " + getOrdinal(year - 1940) + " edition of the event. ";
}
const BUILD_AT = "2026-10-18 08:33";
document.addEventListener("DOMContentLoaded", () => {
  const b = document.getElementById("build");
  if (b) b.textContent = `v${DATA_V} · ${BUILD_AT}`;
  const brand = document.querySelector(".brand");
  if (brand) brand.addEventListener("click", e => {
    e.preventDefault();
    history.replaceState(null, "", location.pathname);
    location.reload();
  });
});

        // TBD Some global data (to be moved?)

const TYPE_INFO = { // TBD check descriptions and links
  "Waltz": {
    label: "dance form",
    desc: "A waltz is a dance in triple time, central to the Viennese tradition.",
    wiki: "https://en.wikipedia.org/wiki/Waltz"
  },
  "Polka": {
    label: "dance form",
    desc: "A polka is a lively dance in duple time, originally from Bohemia. Polka schnell is a faster and more brilliant variant. Polka mazurka combines polka rhythm with mazurka accents. Polka francaise is lighter and more elegant in character.",
    wiki: "https://en.wikipedia.org/wiki/Polka"
  },
  "March": {
    label: "musical form",
    desc: "A processional piece with a strong rhythmic drive.",
    wiki: "https://en.wikipedia.org/wiki/March_(music)"
  },
  "Galop": {
    label: "dance form",
    desc: "A galop is a very fast dance, typically used as a closing number.",
    wiki: "https://en.wikipedia.org/wiki/Galop"
  },
  "Quadrille": {
    label: "dance form",
    desc: "A quadrille is a suite of short dances, originally for ballroom figures.",
    wiki: "https://en.wikipedia.org/wiki/Quadrille"
  },
  "Overture": {
    label: "musical form",
    desc: "Introductory orchestral piece, often opening an opera or operetta.",
    wiki: "https://en.wikipedia.org/wiki/Overture"
  },
  "Csárdás": {
    label: "dance form",
    desc: "Hungarian dance with a slow introduction followed by a fast section.",
    wiki: "https://en.wikipedia.org/wiki/Cs%C3%A1rd%C3%A1s"
  },
  "Fantasie": {
    label: "musical form",
    desc: "Free-form composition with an improvisatory character.",
    wiki: "https://en.wikipedia.org/wiki/Fantasia_(musical_form)"
  }
};  
        



// "Played in N concerts" counts editions; a piece played twice in one concert (Radetzky 2001,
// Blue Danube 1967) is one concert and two performances. Both numbers are said when they differ.
function piecePlayedText(name, pid) {
  const hits = concerts.filter(c => c.program.piece_id.includes(pid));
  const per = c => c.program.piece_id.filter(x => x === pid).length;
  const performances = hits.reduce((n, c) => n + per(c), 0);
  const y = c => '<a style="color:blue">' + c.year + '</a>';
  let t = 'The piece <em style="color:blue">' + name + '</em> was played ';
  if (hits.length === 1) t += 'in <strong>only one concert</strong>: ' + y(hits[0]);
  else if (hits.length === 2) t += 'in <strong>two concerts</strong>: ' + y(hits[0]) + ' and ' + y(hits[1]);
  else t += 'in <strong>' + hits.length + ' concerts</strong>: ' + hits.slice(0, -1).map(y).join(', ') + ' and ' + y(hits[hits.length - 1]);
  t += '.';
  if (performances > hits.length) {
    const twice = hits.filter(c => per(c) > 1).map(c => c.year);
    t += ' Counting repeats within a concert, it was performed <strong>' + performances +
         ' times</strong> (more than once in ' + twice.join(', ') + ').';
  }
  return t;
}


// A joint work ("Johann Strauß II., Josef Strauß") belongs to each of its authors.
function composerNames(text) {
  return String(text).split(/,\s*(?=[A-ZÉ])/).map(x => x.trim()).filter(Boolean);
}
// One span per author: the first keeps the class the click loops index by, the others are "composer_extra".
function composerSpans(text, cls) {
  return composerNames(text).map((n, i) => '<span class="' + (i === 0 ? cls : "composer_extra") + '">' + n + "</span>").join(", ");
}
// Concerts where at least one piece is by this person (alone or with others).
function concertsByComposerName(name) {
  return concerts.filter(c => c.program.piece_id.some(pid => {
    const item = getPieceByIdFromCatalogue(pid)[0];
    return item && composerNames(item.composer).includes(name);
  }));
}
function concertsByType(type) {
  return concerts.filter(c => c.program.piece_id.some(pid => {
    const item = getPieceByIdFromCatalogue(pid)[0];
    return item && item.type === type;
  }));
}
function lightYears(list, colour) {
  list.forEach(c => { if (c.year != selected_year) $("label[for='" + c.year + "']").css("background-color", colour); });
}
function yearsSentence(list, colour) {
  const y = c => '<a style="color:' + colour + '">' + c.year + '</a>';
  if (list.length === 1) return 'in only <strong>one concert</strong>: ' + y(list[0]) + '.';
  if (list.length === 2) return 'in <strong>two concerts</strong>: ' + y(list[0]) + ' and ' + y(list[1]) + '.';
  return 'in <strong>' + list.length + ' concerts</strong>: ' + list.slice(0, -1).map(y).join(', ') + ' and ' + y(list[list.length - 1]) + '.';
}
// Clicking a composer, in the programme or in the encores: their name in red wherever it appears in
// this concert, the years with any piece of theirs in red, and their biography link.
function composerClicked(el) {
  resetColors();
  const name = el.textContent.trim();
  document.querySelectorAll("#list_pieces_program .composer_printed, #list_pieces_program .composer_extra, " +
    "#list_pieces_encores .composer_encore_printed, #list_pieces_encores .composer_extra").forEach(sp => {
    if (sp.textContent.trim() === name) sp.style.color = "red";
  });
  years_of_this_composer = concertsByComposerName(name);
  lightYears(years_of_this_composer, "red");
  let text_other = (years_of_this_composer.length === 1 ? 'A piece composed by ' : 'Pieces composed by ') +
    '<em style="color:red">' + name + '</em> ' + (years_of_this_composer.length === 1 ? 'was' : 'were') +
    ' played ' + yearsSentence(years_of_this_composer, "red");
  const person = getIdByComposer(name)[0];
  if (person && person.links.wiki.en) {
    text_other += '<br><br> Find the biography of <em style="color:red">' + name + '</em> in this Wikipedia <a href="' + person.links.wiki.en + '" target="_blank">link.</a>';
  }
  document.getElementById("info_text").innerHTML = text_other;
}

// YouTube refuses watch?v= and youtu.be addresses inside an iframe; only /embed/ works.
function youtubeEmbed(url) {
  const m = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  return m ? 'https://www.youtube.com/embed/' + m[1] : url;
}

        // functions to filter in the database

                        function getConcertByYear(code) {
                            return concerts.filter(
                            function(concerts) {
                                return concerts.year == code
                            }
                            );
                        }
                        function getConcertByConductor(code) {
                            return concerts.filter(
                            function(concerts) {
                                return concerts.conductor == code
                            }
                            );
                        }
                        
                        function getConcertByPiece(code) {
                            return concerts.filter(
                            function(concerts) {
                                return concerts.program.piece.includes(code)
                            }
                            );
                        }

                        function getConcertByPieceId(code) {
                            // console.log(code)
                            return concerts.filter(
                            function(concerts) {
                                return concerts.program.piece_id.includes(code)
                            }
                            );
                        }

                        function getConcertByConductorId(code) {  // to be tested
                            console.log(code)
                            return concerts.filter(
                            function(concerts) {
                                return concerts.conductor_id == code
                            }
                            );
                        }

                        function getConcertByComposer(code) {
                            return concerts.filter(
                            function(concerts) {
                                return concerts.program.composer.includes(code)
                            }
                            );
                        }
                        function getConcertByComposerId(composerId) {
                          var target = Number(composerId);

                          return concerts.filter(function(c) {
                            if (!c.program || !Array.isArray(c.program.piece_id)) return false;

                            for (var i = 0; i < c.program.piece_id.length; i++) {
                              var pid = c.program.piece_id[i];
                              var item = getPieceByIdFromCatalogue(pid); // returns [pieceObj] or []
                              if (item && item[0] && Number(item[0].composer_id) === target) return true;
                            }
                            return false;
                          });
                        }

                        // function getConcertByComposerId(code) {
                        //     return concerts.filter(
                        //     function(concerts) {
                        //         return concerts.program.composer_id.includes(code)
                        //     }
                        //     );
                        // }

                        // function getConcertByType(code) {
                        //     return concerts.filter(
                        //     function(concerts) {
                        //         return concerts.program.type.includes(code)
                        //     }
                        //     );
                        // }

     
     
                        function getPieceByIdFromCatalogue(code) {
                            return catalogue.filter(
                            function(catalogue) {
                                return catalogue.piece_id == code
                            }
                            );
                        }

                        function getIdByComposer(code) {
                            return composers.filter(
                            function(composers) {
                                return composers.name == code
                            }
                            );
                        }

                        function getConductorById(code) {
                            return conductors.filter(
                            function(conductors) {
                                return conductors.id == code
                            }
                            );
                        }

                        
                        function getIdByPiece(code) {
                            return catalogue.filter(
                            function(catalogue) {
                                return catalogue.piece == code
                            }
                            );
                        }

        // to avoid redundance in the source files, the composers of each piece are added here to the concerts variable (goal: filter by composers)

        


        // reset colors when clicking in something 
        function resetColors() {
            // Reset year buttons to gold_box except for selected_year
            let styleCSS = getComputedStyle(document.body);
            let gold_box = styleCSS.getPropertyValue('--gold_box');
            let clicked_year_color = styleCSS.getPropertyValue('--clicked_year_color');

            for (let year_ii = last_year; year_ii > 1940; year_ii--) {
                $("label[for='" + year_ii + "']").css("background-color", gold_box);
            }
            $("label[for='" + 1939 + "']").css("background-color", gold_box);

            // Restore the clicked year's color
            $("label[for='" + selected_year + "']").css("background-color", clicked_year_color);

            // Reset program pieces, composers, and type
            let allPieces = document.getElementsByClassName("piece_printed");
            for (let piece of allPieces) {
                piece.style.color = "black"; // Reset to default black
            }
            let allTypes = document.getElementsByClassName("type_printed");
            for (let type of allTypes) {
                type.style.color = "black"; // Reset to default black
            }

            for (let extra of document.getElementsByClassName("composer_extra")) extra.style.color = "black";
            let allComposers = document.getElementsByClassName("composer_printed");
            for (let composer of allComposers) {
                composer.style.color = "black"; // Reset to default black
            }

            // Reset encores (if present)
            if (typeof elementos_encore_printed !== "undefined") {
                for (let encore of elementos_encore_printed) {
                    encore.style.color = "black";
                }
            }
            if (typeof elementos_composer_encore_printed !== "undefined") {
                for (let composer_encore of elementos_composer_encore_printed) {
                    composer_encore.style.color = "black";
                }
            }
            if (typeof elementos_type_encore_printed !== "undefined") {
                for (let type_encore of elementos_type_encore_printed) {
                    type_encore.style.color = "black";
                }
            }
            // Reset conductor
            let conductorElement = document.getElementById("conductor");
            if (conductorElement) {
                conductorElement.style.color = "black"; // Reset conductor to black
            }
        }














        // Key of the file: the whole page regenerates when clicking here
                        function clickOnYear(year){
                            previous_year = selected_year;
                            selected_year = year;
                            resetColors()
                            var found_by_year = getConcertByYear(selected_year);
                            
                            // this code below should not be here (does not work). But otherwise, some never get back.
                            var styleCSS = getComputedStyle(document.body);
                            clicked_year_color = styleCSS.getPropertyValue('--clicked_year_color');   
                            gold_box = styleCSS.getPropertyValue('--gold_box');   
                            
                            $("label[for='" + previous_year + "']").css("background-color", gold_box);
                            $("label[for='" + selected_year + "']").css("background-color", clicked_year_color);
                            
                            
                            // console.log(found_by_year[0].year)
                            // find which years this conductors was present
                            this_year_conductor_id = found_by_year[0].conductor_id;
                            this_year_conductor_item = getConductorById(this_year_conductor_id)
                            this_year_conductor_name = this_year_conductor_item[0].name
                            
                            
                            document.getElementById("conductor").innerHTML = this_year_conductor_name;
                            document.getElementById("program_title").innerHTML = "<strong></u><u>Program:</u></strong>";
                            


                            
                            // get info
                            document.getElementById("concert").innerHTML =
                            "New Year's Concert " + selected_year;
                            let pieces_id_year_x = found_by_year[0].program.piece_id; 
                            let pieces_year_x = []; // initialized
                            let composers_year_x = []; // initialized
                            let types_year_x = [];
                            for (let i = 0; i < pieces_id_year_x.length; i++) { 
                                item_ii_year_x = getPieceByIdFromCatalogue(pieces_id_year_x[i]); 
                                pieces_year_x[i] = item_ii_year_x[0].piece;
                                composers_year_x[i] = item_ii_year_x[0].composer;
                                types_year_x[i] = item_ii_year_x[0].type;
                            }
                            
                            
                            

                            // print program
                            
                            let list = document.getElementById("list_pieces_program");    
                            list.innerHTML = '';
                            
                            n_all = pieces_year_x.length;
                            n_program = found_by_year[0].n_program;
                            n_encores = n_all - n_program;       
                            for (let i = 0; i < n_program; i++) {
                                let li = document.createElement("li");
                                var piece_i = pieces_year_x[i];
                                var composer_i = composers_year_x[i];
                                var type_i = types_year_x[i];
                                // li.innerHTML +=  '<em class="piece_printed">' + piece_i + "</em>" + " (" + composerSpans(composer_i, "composer_printed") + ")" ; 
            
                                if(type_i == "Unknown"){
                                    li.innerHTML +=  '<em class="piece_printed">' + piece_i + "</em>" + " (" + composerSpans(composer_i, "composer_printed") + ")" ; 
                                }
                                else{
                                    li.innerHTML +=  '<em class="piece_printed">' + piece_i + "</em>" + ', <span class="type_printed">' + type_i + "</span>, (" + composerSpans(composer_i, "composer_printed") + ")" ; 
                                }

                                list.appendChild(li);
                            };

                            

                            elementos_piece_printed = document.getElementsByClassName("piece_printed");
                            elementos_composer_printed = document.getElementsByClassName("composer_printed");
                            elementos_type_printed = document.getElementsByClassName("type_printed");
                            
                            // print encores
                            
                            console.log(n_encores)
                            let list_encores = document.getElementById("list_pieces_encores");    
                            list_encores.innerHTML = '';        
                            for (let i = n_program; i < n_all; i++) {
                                let li = document.createElement("li");
                                var encore_i = pieces_year_x[i];
                                var composer_encore_i = composers_year_x[i];
                                var type_encore_i = types_year_x[i];
                                // li.innerHTML +=  '<em class="encore_printed">' + encore_i + "</em>" + " (" + composerSpans(composer_encore_i, "composer_encore_printed") + ")" ; 
                                if(type_i == "Unknown"){
                                    li.innerHTML +=  '<em class="encore_printed">' + encore_i + "</em>" + " (" + composerSpans(composer_encore_i, "composer_encore_printed") + ")" ; 
                                }
                                else{
                                    li.innerHTML +=  '<em class="encore_printed">' + encore_i + "</em>" + ', <span class="type_encore_printed">' + type_encore_i + "</span>, (" + composerSpans(composer_encore_i, "composer_encore_printed") + ")" ; 
                                }
                                list_encores.appendChild(li);
                            };
                            
                            if(n_encores>0)
                            {
                                elementos_encore_printed = document.getElementsByClassName("encore_printed");
                                elementos_composer_encore_printed = document.getElementsByClassName("composer_encore_printed");
                                elementos_type_encore_printed = document.getElementsByClassName("type_encore_printed");
                            }
                            // print information

                            // Numbered as the Vienna Philharmonic numbers them: its concert archive calls
                            // 1 January 1941 the "1st New Year's Concert". 31 December 1939 comes before the series.
                            edition = selected_year - 1940;

                            totalPieces = pieces_year_x.length;
                            total_encores = totalPieces - n_program;

                            const uniqueComposers = [...new Set(composers_year_x.flatMap(composerNames))];

                            number_unique_composers = uniqueComposers.length;
                            conductorName = this_year_conductor_name;

                            years_of_this_conductor = getConcertByConductorId(this_year_conductor_id);
                            conductor_total_number_appearances = years_of_this_conductor.length;

                            let all_years_this_conductor = years_of_this_conductor.map(obj => obj.year);
                             let position_conductor = all_years_this_conductor.indexOf(selected_year) + 1; // Add 1 for 1-based index

                             // Text for the right panel

                            if(selected_year == last_year){
                            text_other = 
                                editionText(selected_year, "is") +
                                "It features a total of " + totalPieces + " pieces (including " + n_program + " pieces in the program and " + total_encores + " encores), composed by " + number_unique_composers + " different composers. " +
                                "The concert is conducted by " + conductorName + ", marking his " + getOrdinal(conductor_total_number_appearances) + " appearance. " ;
                                }
                            else{
                                text_other = 
                                   editionText(selected_year, "was") +
                                   "It featured a total of " + totalPieces + " pieces (including " + n_program + " pieces in the program and " + total_encores + " encores), composed by " + number_unique_composers + " different composers. " +
                                   "The concert was conducted by " + conductorName + ", marking his " + getOrdinal(position_conductor) + " appearance (out of " + conductor_total_number_appearances + " appearances). " ;           
                                }


                            // Update the right panel
                            document.getElementById("info_text").innerHTML = text_other;

                            // Where this programme comes from
                            const src = document.getElementById("concert_source");
                            if (src) {
                                const url = found_by_year[0].source;
                                src.innerHTML = url
                                    ? 'Source: <a href="' + url + '" target="_blank" rel="noopener">official programme, wienerphilharmoniker.at</a>'
                                    : '';
                            }
                            


                            ////////////////////////////////////////
                            //////// LISTENERS BELOW


                            // Second and further authors of a joint work: same behaviour as the first
                            document.querySelectorAll("#list_pieces_program .composer_extra, #list_pieces_encores .composer_extra")
                                .forEach(sp => sp.addEventListener("click", function () { composerClicked(this); }));

                            // Mouse CLICK on conductor
                            document.getElementById("conductor").addEventListener('click', function handleClick() {
                                resetColors()
                                this.style.color = 'green';

                                 years_of_this_conductor = getConcertByConductorId(this_year_conductor_id);
                                console.log("Saved variable length ON conductor: " + years_of_this_conductor.length) 
                                 
                                
                                // all years with this conductor -> green
                                for (let i = 0; i < years_of_this_conductor.length; i++) { 
                                    year_ii = years_of_this_conductor[i].year;
                                    // console.log(year_ii)
                                    if (year_ii != selected_year){
                                        $("label[for='" + year_ii  + "']").css("background-color", "green");
                                    }
                                }
                                
                                // var styleCSS = getComputedStyle(document.body);
                                // gold_box = styleCSS.getPropertyValue('--gold_box');   
                                
                                
                                if (years_of_this_conductor.length == 1){
                                    var text_other = '<a style="color:green">' + this.innerHTML + "</a> conducted the Vienna New Year's Concert <strong>only once</strong>: " + '<a style="color:green">' + years_of_this_conductor[0].year + '</a>.'; 
                                } else if (years_of_this_conductor.length == 2){
                                    var text_other = '<a style="color:green">' + this.innerHTML + "</a> conducted the Vienna New Year's Concert <strong>twice</strong>: " + '<a style="color:green">' + years_of_this_conductor[0].year + '</a>' + ' and ' + '<a style="color:green">' + years_of_this_conductor[1].year + '</a>.'; 
                                }  
                                else {
                                    var text_other = '<a style="color:green">' + this.innerHTML + "</a> conducted the Vienna New Year's Concert  <strong>" + years_of_this_conductor.length + " times</strong>: "; 
                                    
                                    for (let i = 0; i < years_of_this_conductor.length-1; i++) {
                                        
                                        let year_ii = years_of_this_conductor[i].year;
                                        years_highlighted[i] = year_ii;
                                        console.log(years_highlighted[i])
                                        text_other += '<a style="color:green">' + year_ii + '</a>, '
                                    }
                                    text_other += ' and ' + '<a style="color:green">' + years_of_this_conductor[years_of_this_conductor.length-1].year + '</a>.';
                                }
                                 
                                

                                 wiki_link_conductor = this_year_conductor_item[0].links.wiki.en
                        
                                if (wiki_link_conductor.length>0) // there is link
                                { 
                                    text_other += '<br><br> Find the biography of <a style="color:green">' + this.innerHTML + '</a> in this Wikipedia <a href='+ wiki_link_conductor +'  target="_blank" >link.</a>'
                                }
                                document.getElementById("info_text").innerHTML = text_other;
                            });     
                            
                            
                            
                            // Mouse OUT on conductor
                            
                            // document.getElementById("conductor").addEventListener('mouseout', function handleMouseOut() {
                            //     // conductor to black
                            //     this.style.color = 'black';
                            //     // colors of boxes back to gold
                                
                            //     // var styleCSS = getComputedStyle(document.body);
                            //     gold_box = styleCSS.getPropertyValue('--gold_box');   
                            //     // console.log("Saved variable length" + years_of_this_conductor.length) 
                            //     for (let i = 0; i < years_of_this_conductor.length; i++) { 
                            //         year_ii = years_of_this_conductor[i].year;
                            //         if (year_ii != selected_year){
                            //             $("label[for='" + year_ii + "']").css("background-color", gold_box);
                            //         }
                            //     }
                                
                            // });




                            
                            
                            ////////////////////////////////////
                            //////////////////////////////////// 
                            // LOOP to add LISTENERS to PIECES and COMPOSERS in both PROGRAM and ENCORES
                            
                            for (let j = 0; j < n_program; j++) {
                                
                                // 1. Mouse CLICK on PIECE on PROGRAM
                                elementos_piece_printed[j].addEventListener('click', function handleClick() {
                                    // reset colors of the program?
                                    resetColors()
                                    



                                    this.style.color = 'blue';
                                    
                                    piece_highlighted = this.innerHTML;
                                    item_filtered = getIdByPiece(piece_highlighted);
                                    piece_highlighted_id = item_filtered[0].piece_id;
                                    years_of_this_piece = getConcertByPieceId(piece_highlighted_id);

                                    console.log(years_of_this_piece)
     

                                    for (let i = 0; i < years_of_this_piece.length; i++) { 
                                        year_ii = years_of_this_piece[i].year;
                                        // console.log(year_ii)
                                        if (year_ii != selected_year){
                                            $("label[for='" + year_ii  + "']").css("background-color", "blue");
                                        }
                                    }
                                    
                                    var text_other = piecePlayedText(this.innerHTML, piece_highlighted_id);

                                    wiki_link_piece = item_filtered[0].links.wiki.en || item_filtered[0].links.wiki.de || ""  // German article when there is no English one
                        
                        if (wiki_link_piece.length>0) // there is link
                        { 
                            //text_other += '<br><br> More information about the piece <a style="color:blue">' + this.innerHTML + '</a> in this Wikipedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                            text_other += '<br><br> Find more information about the piece in this ' + (item_filtered[0].links.wiki.en ? '' : 'German ') + 'Wikipedia <a href="'+ wiki_link_piece +'" target="_blank">link.</a>'
                        }
                        imslp_link_piece = item_filtered[0].links.imslp
                        console.log(imslp_link_piece)
                        if (imslp_link_piece.length>0) // there is link
                        {
                            text_other += '<br><br> Music score in this IMSLP <a href="'+ imslp_link_piece +'" target="_blank">link.</a>'
                        }

                        you_link_piece = item_filtered[0].links.you.other
                        console.log(you_link_piece)
                        if (you_link_piece.length>0) // there is link
                        {
                            // text_other += '<br><br> YouTube link below: <br>  <iframe width="420" height="315" src="' + you_link_piece + '"> </iframe>'
                            text_other += `
                                <br><br> YouTube link below: <br>  
                                <div class="iframe-container">
                                    <iframe src="${youtubeEmbed(you_link_piece)}" frameborder="0" allowfullscreen></iframe>
                                </div>`;
                        }

                        
     

                                    document.getElementById("info_text").innerHTML = text_other;
                                });


                                 // 2. Mouse CLICK on TYPE on PROGRAM
                                 

                                 elementos_type_printed[j].addEventListener('click', function handleClick() {
                                    // reset colors of the program?
                                    resetColors()
                                    // gold_box = styleCSS.getPropertyValue('--gold_box');   




                                    this.style.color = 'orange';
                                    
                                    type_highlighted = this.innerHTML;
 
                                     
                                     
                                    // turn orange the same types appearing in the program
                                    let list = document.getElementById("list_pieces_program");    
                                    var list_elements = list.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_program; i++) {
                                        var type_ii = list_elements[i].getElementsByTagName("span"); 
                                        if(type_ii[0].innerHTML == this.innerHTML){
                                            type_ii[0].style.color = "orange";
                                        }
                                    };

                                    // turn ORANGE the same composer appearing in the encores
                                    let list_enc = document.getElementById("list_pieces_encores");    
                                    var list_elements = list_enc.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_encores; i++) {
                                        var type_ii = list_elements[i].getElementsByTagName("span"); 
                                        if(type_ii[0].innerHTML == this.innerHTML){
                                            type_ii[0].style.color = "orange";
                                        }
                                    };
                                    // text_other = "TBD"
                                    // document.getElementById("info_text").innerHTML = text_other;
                                    const info = TYPE_INFO[type_highlighted] ||
                                                 TYPE_INFO[Object.keys(TYPE_INFO).find(k => type_highlighted.includes(k))];

                                    if (info) {
                                      text_other  = info.desc;
                                      text_other += '<br><br>Find more information about this ' + info.label +
                                                    ' on Wikipedia <a href="' + info.wiki +
                                                    '" target="_blank">here</a>.';
                                    } else {
                                      text_other = "No description available for this type.";
                                    }
                                    const years_of_this_type = concertsByType(type_highlighted);
                                    lightYears(years_of_this_type, "orange");
                                    text_other = '<em style="color:orange">' + type_highlighted + '</em> was played ' + yearsSentence(years_of_this_type, "orange") + '<br><br>' + text_other;

                                    document.getElementById("info_text").innerHTML = text_other;
                                });

                                
                                 // 3. Mouse CLICK on COMPOSER on PROGRAM
                                
                                elementos_composer_printed[j].addEventListener('click', function handleClick() { composerClicked(this); });
                                 // 4. Mouse OUT on COMPOSER on PROGRAM
                                
                                // elementos_composer_printed[j].addEventListener('mouseout', function handleMouseOut() {
                                //     this.style.color = 'black'; // back to black
                                    
                                        
                                //     // turn black the same composer appearing in the program
                                //     let list = document.getElementById("list_pieces_program");    
                                //     var list_elements = list.getElementsByTagName("li");
                                    
                                //     for (let i = 0; i < n_program; i++) {
                                //         var compositor_ii = list_elements[i].getElementsByTagName("a"); 
                                //         if(compositor_ii[0].innerHTML == this.innerHTML){
                                //             compositor_ii[0].style.color = "black";
                                //         }
                                //     };
                                //     // turn black the same composer appearing in the encores
                                //     let list_enc = document.getElementById("list_pieces_encores");    
                                //     var list_elements = list_enc.getElementsByTagName("li");
                                    
                                //     for (let i = 0; i < n_encores; i++) {
                                //         var compositor_ii = list_elements[i].getElementsByTagName("a"); 
                                //         if(compositor_ii[0].innerHTML == this.innerHTML){
                                //             compositor_ii[0].style.color = "black";
                                //         }
                                //     };

                                //     // back to normal colors in year boxes
                                    
                                //     for (let i = 0; i < years_of_this_composer.length; i++) { 
                                //         year_ii = years_of_this_composer[i].year;
                                //         if (year_ii != selected_year){
                                //             $("label[for='" + year_ii + "']").css("background-color", gold_box);
                                //         }
                                //     }
                                // });
                            }
                 



                            // below, 4 listerners for the encores


                            for (let j = 0; j < n_encores; j++) {
                                
                                // 5. Mouse CLICK on PIECE on ENCORE
                                elementos_encore_printed[j].addEventListener('click', function handleClick() {
                                    resetColors()


                                    this.style.color = 'blue';
                                    
                                    piece_highlighted = this.innerHTML;
                                    item_filtered = getIdByPiece(piece_highlighted);
                                    piece_highlighted_id = item_filtered[0].piece_id;

                                     years_of_this_piece = getConcertByPieceId(piece_highlighted_id);

     
                                    console.log(years_of_this_piece)
     

                                    for (let i = 0; i < years_of_this_piece.length; i++) { 
                                        year_ii = years_of_this_piece[i].year;
                                        // console.log(year_ii)
                                        if (year_ii != selected_year){
                                            $("label[for='" + year_ii  + "']").css("background-color", "blue");
                                        }
                                    }
                                    
                                    
                                    var text_other = piecePlayedText(this.innerHTML, piece_highlighted_id);


                                    wiki_link_piece = item_filtered[0].links.wiki.en || item_filtered[0].links.wiki.de || ""  // German article when there is no English one
                        
                        if (wiki_link_piece.length>0) // there is link
                        { 
                            // text_other += '<br><br> More information about the piece <a style="color:blue">' + this.innerHTML + '</a> in this Wikipedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                            text_other += '<br><br> Find more information about the piece in this ' + (item_filtered[0].links.wiki.en ? '' : 'German ') + 'Wikipedia <a href="'+ wiki_link_piece +'" target="_blank">link.</a>'
                        }
                        imslp_link_piece = item_filtered[0].links.imslp
                        console.log(imslp_link_piece)
                        if (imslp_link_piece.length>0) // there is link
                        {
                            text_other += '<br><br> Music score in this IMSLP <a href="'+ imslp_link_piece +'" target="_blank">link.</a>'
                        }

                        you_link_piece = item_filtered[0].links.you.other
                        console.log(you_link_piece)
                        if (you_link_piece.length>0) // there is link
                        {
                            text_other += `
                                                            <br><br> YouTube link below: <br>  
                                                            <div class="iframe-container">
                                                                <iframe src="${youtubeEmbed(you_link_piece)}" frameborder="0" allowfullscreen></iframe>
                                                            </div>`;
                        }

                                    document.getElementById("info_text").innerHTML = text_other;
                                });



                                


                                 // 6. Mouse CLICK on TYPE on ENCORES

                                    
                                                             elementos_type_encore_printed[j].addEventListener('click', function handleClick() {
                                        // reset colors of the program?
                                        resetColors()
                                        // gold_box = styleCSS.getPropertyValue('--gold_box');   




                                        this.style.color = 'orange';
                                        
                                        type_highlighted = this.innerHTML;
                                    
                                         
                                         
                                        // turn orange the same types appearing in the program
                                        let list = document.getElementById("list_pieces_program");    
                                        var list_elements = list.getElementsByTagName("li");
                                        
                                        for (let i = 0; i < n_program; i++) {
                                            var type_ii = list_elements[i].getElementsByTagName("span"); 
                                            if(type_ii[0].innerHTML == this.innerHTML){
                                                type_ii[0].style.color = "orange";
                                            }
                                        };

                                        // turn ORANGE the same composer appearing in the encores
                                        let list_enc = document.getElementById("list_pieces_encores");    
                                        var list_elements = list_enc.getElementsByTagName("li");
                                        
                                        for (let i = 0; i < n_encores; i++) {
                                            var type_ii = list_elements[i].getElementsByTagName("span"); 
                                            if(type_ii[0].innerHTML == this.innerHTML){
                                                type_ii[0].style.color = "orange";
                                            }
                                        };
                                        console.log(type_highlighted)
                                        // text_other = "TBD 2"
                                        // const desc = TYPE_INFO[type_highlighted] || "No description available.";
                                        // text_other = desc;

                                        // const info = TYPE_INFO[type_highlighted];
                                        // Try exact match first (e.g. "Polka"), otherwise fall back to partial match
                                        // (e.g. "Polka schnell" -> "Polka")
                                        const info = TYPE_INFO[type_highlighted] ||
                                                     TYPE_INFO[Object.keys(TYPE_INFO).find(k => type_highlighted.includes(k))];

                                        if (info) {
                                          text_other  = info.desc;
                                          text_other += '<br><br>Find more information about this ' + info.label +
                                                        ' on Wikipedia <a href="' + info.wiki +
                                                        '" target="_blank">here</a>.';
                                        } else {
                                          text_other = "No description available for this type.";
                                        }
                                        const years_of_this_type = concertsByType(type_highlighted);
                                        lightYears(years_of_this_type, "orange");
                                        text_other = '<em style="color:orange">' + type_highlighted + '</em> was played ' + yearsSentence(years_of_this_type, "orange") + '<br><br>' + text_other;

                                        document.getElementById("info_text").innerHTML = text_other;

                                        // turn ORANGE year boxes in red for years where the composer appeared: TBD (adapted from the composer). Then, do the same with the TYPE OF ENCORES

                                        // type_highlighted = this.innerHTML;
                                        // console.log(this.innerHTML)
                                        // years_of_this_type = getConcertByType(type_highlighted);
                                        
                                        // for (let i = 0; i < years_of_this_composer.length; i++) { 
                                        //     year_ii = years_of_this_type[i].year;
                                        //      if (year_ii != selected_year){
                                        //         $("label[for='" + year_ii  + "']").css("background-color", "orange");
                                        //     }
                                        // }
                                    });

                                
                                 // 7. Mouse CLICK on COMPOSER on ENCORES
                                
                                    elementos_composer_encore_printed[j].addEventListener('click', function handleClick() { composerClicked(this); });
                                 // 8. Mouse OUT on COMPOSER on ENCORES
                                
                                //  elementos_composer_encore_printed[j].addEventListener('mouseout', function handleMouseOut() {
                                //     this.style.color = 'black'; // back to black
                                    
                                        
                                //     // turn black the same composer appearing in the program
                                //     let list = document.getElementById("list_pieces_program");    
                                //     var list_elements = list.getElementsByTagName("li");
                                    
                                //     for (let i = 0; i < n_program; i++) {
                                //         var compositor_ii = list_elements[i].getElementsByTagName("a"); 
                                //         if(compositor_ii[0].innerHTML == this.innerHTML){
                                //             compositor_ii[0].style.color = "black";
                                //         }
                                //     };
                                //     // turn black the same composer appearing in the encores
                                //     let list_enc = document.getElementById("list_pieces_encores");    
                                //     var list_elements = list_enc.getElementsByTagName("li");
                                    
                                //     for (let i = 0; i < n_encores; i++) {
                                //         var compositor_ii = list_elements[i].getElementsByTagName("a"); 
                                //         if(compositor_ii[0].innerHTML == this.innerHTML){
                                //             compositor_ii[0].style.color = "black";
                                //         }
                                //     };

                                //     // back to normal colors in year boxes
                                    
                                //     for (let i = 0; i < years_of_this_composer.length; i++) { 
                                //         year_ii = years_of_this_composer[i].year;
                                //         if (year_ii != selected_year){
                                //             $("label[for='" + year_ii + "']").css("background-color", gold_box);
                                //         }
                                //     }
                                // });
                            }



                        }
                         
                            
                            
                    // Add 'clickable' class to all elements with a 'click' event listener (so later we can change cursor when on them)
const originalAddEventListener = EventTarget.prototype.addEventListener;

EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'click') {
        this.classList?.add('clickable');
    }
    originalAddEventListener.call(this, type, listener, options);
};        



// SUPPORT

function getOrdinal(number) {
    const j = number % 10,
          k = number % 100;

    if (j === 1 && k !== 11) {
        return `${number}st`;
    }
    if (j === 2 && k !== 12) {
        return `${number}nd`;
    }
    if (j === 3 && k !== 13) {
        return `${number}rd`;
    }
    return `${number}th`;
}

// STATISTICS

// Populate the dropdown with year options (dead code below)

// function populateYearDropdown(concerts) {
//     const dropdown = document.getElementById('yearDropdown');
//     dropdown.innerHTML = ''; // Clear existing options

//     // Add "All Years" option
//     const allYearsOption = document.createElement('option');
//     allYearsOption.value = 'all';
//     allYearsOption.text = 'All Years';
//     dropdown.appendChild(allYearsOption);

//     // Add year options from the concerts data
//     const years = [...new Set(concerts.map(concert => concert.year))].sort((a, b) => b - a);
//     years.forEach(year => {
//         const option = document.createElement('option');
//         option.value = year;
//         option.text = year;
//         dropdown.appendChild(option);
//     });
// }



document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed.');
});

// Generate Bar Chart
// function generateBarChart(filteredConcerts) {
//     const chartContainer = document.getElementById('barChartContainer');
//     chartContainer.innerHTML = ''; // Clear previous chart

//     const compositionCounts = {};

//     filteredConcerts.forEach(concert => {
//         if (concert.program && Array.isArray(concert.program.piece_id)) {
//             concert.program.piece_id.forEach(pieceId => {
//                 compositionCounts[pieceId] = (compositionCounts[pieceId] || 0) + 1;
//             });
//         } else {
//             console.warn('Invalid program or piece_id in concert:', concert);
//         }
//     });

//     const labels = Object.keys(compositionCounts); // These are piece IDs
//     const data = Object.values(compositionCounts);

//     console.log('Bar chart data:', labels, data);

//     // Placeholder for bar chart drawing
//     chartContainer.textContent = 'Bar chart will be displayed here.';
// }

// Generate Pie Chart
// function generatePieChart(filteredConcerts) {
//     const chartContainer = document.getElementById('pieChartContainer');
//     chartContainer.innerHTML = '<canvas id="pieChart"></canvas>'; // Add canvas for Chart.js

//     const composerCounts = {};
//     filteredConcerts.forEach(concert => {
//         concert.program.composer.forEach(composer => {
//             composerCounts[composer] = (composerCounts[composer] || 0) + 1;
//         });
//     });

//     const labels = Object.keys(composerCounts);
//     const data = Object.values(composerCounts);

//     // Create Pie Chart
//     const ctx = document.getElementById('pieChart').getContext('2d');
//     new Chart(ctx, {
//         type: 'pie',
//         data: {
//             labels: labels,
//             datasets: [{
//                 data: data,
//                 backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#9966FF', '#FF9F40'],
//             }]
//         },
//         options: {
//             responsive: true,
//             plugins: {
//                 legend: { display: true },
//                 title: { display: true, text: 'Composer Distribution' }
//             }
//         }
//     });
// }
 

 window._charts = window._charts || {};

 function renderLineChart(canvasId, labels, series) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   window._charts[canvasId] = new Chart(ctx, {
     type: 'line',
     data: {
       labels,
       datasets: series.map(s => ({
         label: s.label,
         data: s.data
       }))
     },
     options: {
       responsive: true,
       maintainAspectRatio: false,
       scales: {
         y: {
           beginAtZero: true   // <<< THIS
         }
       }
     }
   });
 }

 function renderBarChart(canvasId, labels, datasets) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   window._charts[canvasId] = new Chart(ctx, {
     type: 'bar',
     data: { labels, datasets },
     options: {
       responsive: true,
       maintainAspectRatio: false
     }
   });
 }


 // Horizontal bar chart (for long labels, rankings)
 function renderBarChartHorizontal(canvasId, labels, datasets) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   const MAX_LABEL = 35;
   const shortLabels = labels.map(l =>
     l.length > MAX_LABEL ? l.slice(0, MAX_LABEL) + '…' : l
   );

   window._charts[canvasId] = new Chart(ctx, {
     type: 'bar',
     data: { labels: shortLabels, datasets },
     options: {
       indexAxis: 'y', // this is what makes it horizontal
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
         tooltip: {
           callbacks: {
             title: items => labels[items[0].dataIndex] // full label
           }
         },
         legend: { display: false }
       },
       scales: {
         x: { beginAtZero: true },
         y: {
           ticks: {
             autoSkip: false,      // show every label
             maxRotation: 0,
             minRotation: 0
           }
         }
       }
     }
   });
 }

 function renderStackedBarChart(canvasId, labels, series) {
   const canvas = document.getElementById(canvasId);
   if (!canvas) return;
   const ctx = canvas.getContext('2d');

   if (window._charts[canvasId]) window._charts[canvasId].destroy();

   window._charts[canvasId] = new Chart(ctx, {
     type: 'bar',
     data: { labels, datasets: series.map(s => ({ label: s.label, data: s.data })) },
     options: {
       responsive: true,
       maintainAspectRatio: false,
       scales: { x: { stacked: true }, y: { stacked: true } }
     }
   });
 }


function renderPieChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window._charts[canvasId]) window._charts[canvasId].destroy();

  window._charts[canvasId] = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}


function renderLineChart(canvasId, labels, datasets) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window._charts[canvasId]) window._charts[canvasId].destroy();

  window._charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: true },
      plugins: {
        tooltip: {
          callbacks: {
            // This replaces the "1" (rank) with the piece title, if provided
            title: function(items) {
              if (!items || !items.length) return '';
              const it = items[0];
              const ds = it.dataset || {};
              const idx = it.dataIndex;

              const rank = it.label; // this is "1", "2", ...
              const title = (Array.isArray(ds.pointTitles) && ds.pointTitles[idx]) ? ds.pointTitles[idx] : '';
              const composer = (Array.isArray(ds.pointComposers) && ds.pointComposers[idx]) ? ds.pointComposers[idx] : '';

              if (title && composer) return '#' + rank + ' – ' + title + ' (' + composer + ')';
              if (title) return '#' + rank + ' – ' + title;
              return it.label;
            }
          }
        }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
}



// --- Every screen is a link (CONVENTIONS.md section 2c) ---------------------------------------------
// #1987                  a concert
// #1987/piece-298        a piece selected inside that concert
// #1987/composer-20      a composer, by id
// #1987/conductor        the conductor of that concert
// #1987/type-Waltz       a musical form
// Clicks write the hash (back walks through it); opening or reloading a link replays the clicks.

let applyingHash = false;

function pieceIdOfElement(el) {
  const hit = getIdByPiece(el.innerHTML);
  return hit.length ? hit[0].piece_id : null;
}

function tokenForClick(target) {
  const year = String(selected_year);
  if (target.closest('input[name="radio_years"]')) return target.closest('input').id;
  const piece = target.closest('.piece_printed, .encore_printed');
  if (piece) { const id = pieceIdOfElement(piece); return id ? year + '/piece-' + id : null; }
  const comp = target.closest('.composer_printed, .composer_encore_printed, .composer_extra');
  if (comp) {
    const person = getIdByComposer(comp.textContent.trim())[0];
    return person ? year + '/composer-' + person.id : null;
  }
  if (target.closest('#conductor')) return year + '/conductor';
  const type = target.closest('.type_printed, .type_encore_printed');
  if (type) return year + '/type-' + encodeURIComponent(type.textContent.trim());
  return null;
}

document.addEventListener('click', e => {
  if (applyingHash) return;
  const token = tokenForClick(e.target);
  if (token && ('#' + token) !== location.hash) history.pushState(null, '', '#' + token);
});

// The catalogue table: a piece, a form or a composer opens the concert where it was last played
// (the one on screen if it is there) and selects it, exactly as a click in the programme would.
function concertFor(test) {
  const here = concerts.find(c => c.year === selected_year);
  if (here && test(here)) return here;
  const list = concerts.filter(test);
  return list.length ? list.reduce((a, b) => (b.year > a.year ? b : a)) : null;
}
function openFromCatalogue(token) {
  history.pushState(null, '', '#' + token);
  applyHash();
  document.getElementById('concert').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function handlePieceClick(pieceTxt) {
  const item = getIdByPiece(pieceTxt)[0];
  if (!item) return;
  const c = concertFor(x => x.program.piece_id.includes(item.piece_id));
  if (c) openFromCatalogue(c.year + '/piece-' + item.piece_id);
}
function handleTypeClick(type) {
  const c = concertFor(x => concertsByType(type).includes(x));
  if (c) openFromCatalogue(c.year + '/type-' + encodeURIComponent(type));
}
function handleComposerClick(name) {
  const person = getIdByComposer(name)[0];
  if (!person) return;
  const c = concertFor(x => concertsByComposerName(name).includes(x));
  if (c) openFromCatalogue(c.year + '/composer-' + person.id);
}

function applyHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  const [y, sel] = raw.split('/');
  const year = Number(y);
  if (!raw || !concerts.some(c => c.year === year)) {
    if (!raw && selected_year !== last_year) clickOnYear(last_year);
    return;
  }
  applyingHash = true;
  try {
    const input = document.getElementById(String(year));
    if (input) input.checked = true;
    clickOnYear(year);
    if (!sel) return;
    const lists = '#list_pieces_program, #list_pieces_encores';
    if (sel === 'conductor') {
      document.getElementById('conductor').click();
    } else if (sel.startsWith('piece-')) {
      const id = Number(sel.slice(6));
      const el = [...document.querySelectorAll('.piece_printed, .encore_printed')].find(e => pieceIdOfElement(e) === id);
      if (el) el.click();
    } else if (sel.startsWith('composer-')) {
      const person = composers.find(c => c.id === Number(sel.slice(9)));
      const span = person && [...document.querySelectorAll('.composer_printed, .composer_encore_printed, .composer_extra')]
        .find(sp => sp.textContent.trim() === person.name);
      if (span) span.click();
    } else if (sel.startsWith('type-')) {
      const name = sel.slice(5);
      const el = [...document.querySelectorAll('.type_printed, .type_encore_printed')].find(e => e.textContent.trim() === name);
      if (el) el.click();
    }
  } finally {
    applyingHash = false;
  }
}

window.addEventListener('popstate', applyHash);
window.addEventListener('load', applyHash);
