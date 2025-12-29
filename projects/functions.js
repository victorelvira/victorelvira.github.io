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
    desc: "A match Processional piece with strong rhythmic drive.",
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
                            console.log(code)
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
                                // li.innerHTML +=  '<em class="piece_printed">' + piece_i + "</em>" + " (" + '<span class="composer_printed">' + composer_i + "</span>" + ")" ; 
            
                                if(type_i == "Unknown"){
                                    li.innerHTML +=  '<em class="piece_printed">' + piece_i + "</em>" + " (" + '<span class="composer_printed">' + composer_i + "</span>" + ")" ; 
                                }
                                else{
                                    li.innerHTML +=  '<em class="piece_printed">' + piece_i + "</em>" + ', <span class="type_printed">' + type_i + "</span>, (" + '<span class="composer_printed">' + composer_i + "</span>" + ")" ; 
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
                                // li.innerHTML +=  '<em class="encore_printed">' + encore_i + "</em>" + " (" + '<span class="composer_encore_printed">' + composer_encore_i + "</span>" + ")" ; 
                                if(type_i == "Unknown"){
                                    li.innerHTML +=  '<em class="encore_printed">' + encore_i + "</em>" + " (" + '<span class="composer_encore_printed">' + composer_encore_i + "</span>" + ")" ; 
                                }
                                else{
                                    li.innerHTML +=  '<em class="encore_printed">' + encore_i + "</em>" + ', <span class="type_encore_printed">' + type_encore_i + "</span>, (" + '<span class="composer_encore_printed">' + composer_encore_i + "</span>" + ")" ; 
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

                            if (selected_year === 1939) {
                                edition = 1;
                            } else {
                                edition = selected_year - 1939;
                            }

                            totalPieces = pieces_year_x.length;
                            total_encores = totalPieces - n_program;

                            const uniqueComposers = [...new Set(composers_year_x)];

                            number_unique_composers = uniqueComposers.length;
                            conductorName = this_year_conductor_name;

                            years_of_this_conductor = getConcertByConductorId(this_year_conductor_id);
                            conductor_total_number_appearances = years_of_this_conductor.length;

                            let all_years_this_conductor = years_of_this_conductor.map(obj => obj.year);
                             let position_conductor = all_years_this_conductor.indexOf(selected_year) + 1; // Add 1 for 1-based index

                             // Text for the right panel

                            if(selected_year == last_year){
                            text_other = 
                                "The New Year's Concert " + selected_year + " is the " + getOrdinal(edition) + " edition of the event. " +
                                "It features a total of " + totalPieces + " pieces (including " + n_program + " pieces in the program and " + total_encores + " encores), composed by " + number_unique_composers + " different composers. " +
                                "The concert is conducted by " + conductorName + ", marking his " + getOrdinal(conductor_total_number_appearances) + " appearance. " ;
                                }
                            else{
                                text_other = 
                                   "The New Year's Concert " + selected_year + " was the " + getOrdinal(edition) + " edition of the event. " +
                                   "It featured a total of " + totalPieces + " pieces (including " + n_program + " pieces in the program and " + total_encores + " encores), composed by " + number_unique_composers + " different composers. " +
                                   "The concert was conducted by " + conductorName + ", marking his " + getOrdinal(position_conductor) + " appearance (out of " + conductor_total_number_appearances + " appearances). " ;           
                                }


                            // Update the right panel
                            document.getElementById("info_text").innerHTML = text_other;
                            


                            ////////////////////////////////////////
                            //////// LISTENERS BELOW


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
                                    
                                    if (years_of_this_piece.length == 1){
                                        var text_other = 'The piece <em style="color:blue">' + this.innerHTML + '</em> was played <strong>only once</strong>: ' + '<a style="color:blue">' + years_of_this_piece[0].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                    } else if (years_of_this_piece.length == 2){
                                        var text_other = 'The piece <em style="color:blue">' + this.innerHTML + '</em> was played <strong>twice</strong>: ' + '<a style="color:blue">' + years_of_this_piece[0].year + '</a>' + ' and ' + '<a style="color:blue">' + years_of_this_piece[1].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                    }  
                                    else {
                                        var text_other = 'The piece <em style="color:blue">' + this.innerHTML + '</em> was played <strong>' + years_of_this_piece.length + ' times</strong>: '; 
                                        
                                        for (let i = 0; i < years_of_this_piece.length-1; i++) {
                                            let year_ii = years_of_this_piece[i].year;
                                            text_other += '<a style="color:blue">' + year_ii + '</a>, '
                                        }
                                        text_other += ' and ' + '<a style="color:blue">' + years_of_this_piece[years_of_this_piece.length-1].year + '</a>.';
                                    } 

                                    wiki_link_piece = item_filtered[0].links.wiki.en
                        
                        if (wiki_link_piece.length>0) // there is link
                        { 
                            //text_other += '<br><br> More information about the piece <a style="color:blue">' + this.innerHTML + '</a> in this Wikipedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                            text_other += '<br><br> Find more information about the piece in this Wikipedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                        }
                        imslp_link_piece = item_filtered[0].links.imslp
                        console.log(imslp_link_piece)
                        if (imslp_link_piece.length>0) // there is link
                        {
                            text_other += '<br><br> Music score in this IMSLP <a href='+ imslp_link_piece +'  target="_blank" >link.</a>'
                        }

                        you_link_piece = item_filtered[0].links.you.other
                        console.log(you_link_piece)
                        if (you_link_piece.length>0) // there is link
                        {
                            // text_other += '<br><br> YouTube link below: <br>  <iframe width="420" height="315" src="' + you_link_piece + '"> </iframe>'
                            text_other += `
                                <br><br> YouTube link below: <br>  
                                <div class="iframe-container">
                                    <iframe src="${you_link_piece}" frameborder="0" allowfullscreen></iframe>
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

                                    document.getElementById("info_text").innerHTML = text_other;
                                });

                                
                                 // 3. Mouse CLICK on COMPOSER on PROGRAM
                                
                                elementos_composer_printed[j].addEventListener('click', function handleClick() {
                                    console.log("CLICK COMPOSER!! OF YEAR " + selected_year + " and last year is " + last_year)
                                    resetColors()


                                    gold_box = styleCSS.getPropertyValue('--gold_box');   
                                    // console.log("Saved variable length" + years_of_this_conductor.length) 
                                    
                                    this.style.color = 'red'; // turn red the composer where you are
                                    
                                    // turn red the same composer appearing in the program
                                    let list = document.getElementById("list_pieces_program");    
                                    var list_elements = list.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_program; i++) {
                                        var compositor_ii = list_elements[i].getElementsByClassName("composer_printed"); 
                                        console.log(compositor_ii)
                                        if(compositor_ii[0].innerHTML == this.innerHTML){
                                            compositor_ii[0].style.color = "red";
                                        }
                                    };

                                    // turn red the same composer appearing in the encores
                                    let list_enc = document.getElementById("list_pieces_encores");    
                                    var list_elements = list_enc.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_encores; i++) {
                                        console.log(list_elements[i])
                                        var compositor_ii = list_elements[i].getElementsByClassName("composer_encore_printed"); 
                                        console.log(compositor_ii)
                                        if(compositor_ii[0].innerHTML == this.innerHTML){
                                            console.log(compositor_ii)
                                            compositor_ii[0].style.color = "red";
                                        }
                                    };
                                    
                                    // turn red year boxes in red for years where the composer appeared
                                    composer_highlighted = this.innerHTML;
                                    console.log(this.innerHTML)
                                    composer_highlighted_item = getIdByComposer(composer_highlighted);
                                    composer_highlighted_id = composer_highlighted_item[0].id;  

                                    years_of_this_composer = getConcertByComposerId(composer_highlighted_id);
                                    
                                    for (let i = 0; i < years_of_this_composer.length; i++) { 
                                        year_ii = years_of_this_composer[i].year;
                                         if (year_ii != selected_year){
                                            $("label[for='" + year_ii  + "']").css("background-color", "red");
                                        }
                                    }
                                    
                                     if (years_of_this_composer.length == 1){
                                        var text_other = 'A piece composed by <em style="color:red">' + this.innerHTML + '</em> was played in only <strong>one concert</strong>: ' + '<a style="color:red">' + years_of_this_composer[0].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                    } else if (years_of_this_composer.length == 2){
                                        var text_other = 'Pieces composed by <em style="color:red">' + this.innerHTML + '</em> were played in <strong>two concerts</strong>: ' + '<a style="color:red">' + years_of_this_composer[0].year + '</a>' + ' and ' + '<a style="color:red">' + years_of_this_composer[1].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                    }  
                                    else {
                                        var text_other = 'Pieces composed by <em style="color:red">' + this.innerHTML + '</em> were played in <strong>' + years_of_this_composer.length + ' concerts</strong>: ';
                                        
                                        for (let i = 0; i < years_of_this_composer.length-1; i++) {
                                            let year_ii = years_of_this_composer[i].year;
                                            text_other += '<a style="color:red">' + year_ii + '</a>, '
                                        }
                                        text_other += ' and ' + '<a style="color:red">' + years_of_this_composer[years_of_this_composer.length-1].year + '</a>.';
                                    }
                                    
                                // found_by_item = getWikiLinkByItem(this.innerHTML);                           
                                wiki_link_composer = composer_highlighted_item[0].links.wiki.en;

                                if (wiki_link_composer.length>0) // non-empty link
                                {

                                    text_other += '<br><br> Find the biography of <em style="color:red">' + this.innerHTML + '</em> in this Wikipedia <a href='+ wiki_link_composer +'  target="_blank" >link.</a>'
                                }
                                    document.getElementById("info_text").innerHTML = text_other;
                                });

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
                                    
                                    
                                    if (years_of_this_piece.length == 1){
                                        var text_other = 'The piece <em style="color:blue">' + this.innerHTML + '</em> was played <strong>only once</strong> ' + '<a style="color:blue">' + years_of_this_piece[0].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                    } else if (years_of_this_piece.length == 2){
                                        var text_other = 'The piece <em style="color:blue">' + this.innerHTML + '</em> was played <strong>twice</strong>: ' + '<a style="color:blue">' + years_of_this_piece[0].year + '</a>' + ' and ' + '<a style="color:blue">' + years_of_this_piece[1].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                    }  
                                    else {
                                        var text_other = 'The piece <em style="color:blue">' + this.innerHTML + '</em> was played <strong>' + years_of_this_piece.length + ' times</strong>: '; 
                                        
                                        for (let i = 0; i < years_of_this_piece.length-1; i++) {
                                            let year_ii = years_of_this_piece[i].year;
                                            text_other += '<a style="color:blue">' + year_ii + '</a>, '
                                        }
                                        text_other += ' and ' + '<a style="color:blue">' + years_of_this_piece[years_of_this_piece.length-1].year + '</a>.';
                                    }


                                    wiki_link_piece = item_filtered[0].links.wiki.en
                        
                        if (wiki_link_piece.length>0) // there is link
                        { 
                            // text_other += '<br><br> More information about the piece <a style="color:blue">' + this.innerHTML + '</a> in this Wikipedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                            text_other += '<br><br> Find more information about the piece in this Wikipedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                        }
                        imslp_link_piece = item_filtered[0].links.imslp
                        console.log(imslp_link_piece)
                        if (imslp_link_piece.length>0) // there is link
                        {
                            text_other += '<br><br> Music score in this IMSLP <a href='+ imslp_link_piece +'  target="_blank" >link.</a>'
                        }

                        you_link_piece = item_filtered[0].links.you.other
                        console.log(you_link_piece)
                        if (you_link_piece.length>0) // there is link
                        {
                            text_other += `
                                                            <br><br> YouTube link below: <br>  
                                                            <div class="iframe-container">
                                                                <iframe src="${you_link_piece}" frameborder="0" allowfullscreen></iframe>
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
                                
                                    elementos_composer_encore_printed[j].addEventListener('click', function handleClick() {
                                    
                                    resetColors()
                                    this.style.color = 'red'; // turn red the composer where you are
                                    
                                    // turn red the same composer appearing in the program
                                    let list = document.getElementById("list_pieces_program");    
                                    var list_elements = list.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_program; i++) {
                                        var compositor_ii = list_elements[i].getElementsByClassName("composer_printed"); 
                                        console.log(list_elements[i])
                                        if(compositor_ii[0].innerHTML == this.innerHTML){
                                            compositor_ii[0].style.color = "red";
                                        }
                                    };

                                    // turn red the same composer appearing in the encores
                                    let list_enc = document.getElementById("list_pieces_encores");    
                                    var list_elements = list_enc.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_encores; i++) {
                                        var compositor_ii = list_elements[i].getElementsByClassName("composer_encore_printed"); 
                                        if(compositor_ii[0].innerHTML == this.innerHTML){
                                            compositor_ii[0].style.color = "red";
                                        }
                                    };
                                    
                                    // turn red year boxes in red for years where the composer appeared
                                    composer_highlighted = this.innerHTML;
                                    console.log(this.innerHTML)
                                    composer_highlighted_item = getIdByComposer(composer_highlighted);
                                    composer_highlighted_id = composer_highlighted_item[0].id;

                                    years_of_this_composer = getConcertByComposerId(composer_highlighted_id);
                                    
                                    for (let i = 0; i < years_of_this_composer.length; i++) { 
                                        year_ii = years_of_this_composer[i].year;
                                         if (year_ii != selected_year){
                                            $("label[for='" + year_ii  + "']").css("background-color", "red");
                                        }
                                    }


                                    
                                    
                                      if (years_of_this_composer.length == 1){
                                         var text_other = 'Pieces composed by <em style="color:red">' + this.innerHTML + '</em> were played <strong>only once</strong>: ' + '<a style="color:red">' + years_of_this_composer[0].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                     } else if (years_of_this_composer.length == 2){
                                         var text_other = 'Pieces composed by <em style="color:red">' + this.innerHTML + '</em> were played <strong>twice</strong>: ' + '<a style="color:red">' + years_of_this_composer[0].year + '</a>' + ' and ' + '<a style="color:red">' + years_of_this_composer[1].year + '</a>.'; //"The piece X was played in Y, Z, and T."
                                     }  
                                     else {
                                         var text_other = 'Pieces composed by <em style="color:red">' + this.innerHTML + '</em> were played in <strong>' + years_of_this_composer.length + ' concerts</strong>: ';
                                        
                                        for (let i = 0; i < years_of_this_composer.length-1; i++) {
                                            let year_ii = years_of_this_composer[i].year;
                                            text_other += '<a style="color:red">' + year_ii + '</a>, '
                                        }
                                        text_other += ' and ' + '<a style="color:red">' + years_of_this_composer[years_of_this_composer.length-1].year + '</a>.';
                                    }
                                    


                                wiki_link_composer = composer_highlighted_item[0].links.wiki.en;


                       
    if (wiki_link_composer.length>0) // non-empty link
    {

        text_other += '<br><br> Find the biography of <em style="color:red">' + this.innerHTML + '</em> in this Wikipedia <a href='+ wiki_link_composer +'  target="_blank" >link.</a>'
    }
        
        

     
                                    
                                    
                                    document.getElementById("info_text").innerHTML = text_other;

                                        


                                });
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
function generateBarChart(filteredConcerts) {
    const chartContainer = document.getElementById('barChartContainer');
    chartContainer.innerHTML = ''; // Clear previous chart

    const compositionCounts = {};

    filteredConcerts.forEach(concert => {
        if (concert.program && Array.isArray(concert.program.piece_id)) {
            concert.program.piece_id.forEach(pieceId => {
                compositionCounts[pieceId] = (compositionCounts[pieceId] || 0) + 1;
            });
        } else {
            console.warn('Invalid program or piece_id in concert:', concert);
        }
    });

    const labels = Object.keys(compositionCounts); // These are piece IDs
    const data = Object.values(compositionCounts);

    console.log('Bar chart data:', labels, data);

    // Placeholder for bar chart drawing
    chartContainer.textContent = 'Bar chart will be displayed here.';
}

// Generate Pie Chart
function generatePieChart(filteredConcerts) {
    const chartContainer = document.getElementById('pieChartContainer');
    chartContainer.innerHTML = '<canvas id="pieChart"></canvas>'; // Add canvas for Chart.js

    const composerCounts = {};
    filteredConcerts.forEach(concert => {
        concert.program.composer.forEach(composer => {
            composerCounts[composer] = (composerCounts[composer] || 0) + 1;
        });
    });

    const labels = Object.keys(composerCounts);
    const data = Object.values(composerCounts);

    // Create Pie Chart
    const ctx = document.getElementById('pieChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#9966FF', '#FF9F40'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Composer Distribution' }
            }
        }
    });
}
 


