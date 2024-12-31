     
        // maybe these functions can be moved to head

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

                        function getConcertByComposerId(code) {
                            return concerts.filter(
                            function(concerts) {
                                return concerts.program.composer_id.includes(code)
                            }
                            );
                        }

     
     
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

        for (let ii = 0; ii < concerts.length; ii++) { 
            console.log(concerts[ii].program.piece_id)
            concerts[ii].program.composer_id = [];
            for (let jj = 0; jj < concerts[ii].program.piece_id.length; jj++) { 
                item_filtered = getPieceByIdFromCatalogue(concerts[ii].program.piece_id[jj]);
                console.log(item_filtered[0].composer_id)
                concerts[ii].program.composer_id[jj] = item_filtered[0].composer_id;
                
            }
        }


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

            // Reset program pieces and composers
            let allPieces = document.getElementsByClassName("piece_printed");
            for (let piece of allPieces) {
                piece.style.color = "black"; // Reset to default black
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
                for (let composer of elementos_composer_encore_printed) {
                    composer.style.color = "black";
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
                            // console.log("Saved variable length" + years_of_this_conductor.length) 
                            $("label[for='" + previous_year + "']").css("background-color", gold_box);
                            $("label[for='" + selected_year + "']").css("background-color", clicked_year_color);
                            
                            
                            // console.log(found_by_year[0].year)
                            // find which years this conductors was present
                            this_year_conductor_id = found_by_year[0].conductor_id;
                            this_year_conductor_item = getConductorById(this_year_conductor_id)
                            this_year_conductor_name = this_year_conductor_item[0].name
                            
                            
                            document.getElementById("conductor").innerHTML = this_year_conductor_name;
                            document.getElementById("program_title").innerHTML = "<strong></u><u>Program:</u></strong>";
                            


                            
                            // print program
                            document.getElementById("concert").innerHTML =
                            "New Year's Concert " + selected_year;
                            let pieces_id_year_x = found_by_year[0].program.piece_id; 
                            let pieces_year_x = []; // initialized
                            let composers_year_x = []; // initialized
                            for (let i = 0; i < pieces_id_year_x.length; i++) { 
                                item_ii_year_x = getPieceByIdFromCatalogue(pieces_id_year_x[i]); 
                                pieces_year_x[i] = item_ii_year_x[0].piece;
                                composers_year_x[i] = item_ii_year_x[0].composer;
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
                                li.innerHTML +=  '<em class="piece_printed">' + piece_i + "</em>" + " (" + '<a class="composer_printed">' + composer_i + "</a>" + ")" ; 
                                list.appendChild(li);
                            };

                            

                             elementos_piece_printed = document.getElementsByClassName("piece_printed");
                            elementos_composer_printed = document.getElementsByClassName("composer_printed");
                            
                            // print encores
                            
                            console.log(n_encores)
                            let list_encores = document.getElementById("list_pieces_encores");    
                            list_encores.innerHTML = '';        
                            for (let i = n_program; i < n_all; i++) {
                                let li = document.createElement("li");
                                var encore_i = pieces_year_x[i];
                                var composer_encore_i = composers_year_x[i];
                                li.innerHTML +=  '<em class="encore_printed">' + encore_i + "</em>" + " (" + '<a class="composer_encore_printed">' + composer_encore_i + "</a>" + ")" ; 
                                list_encores.appendChild(li);
                            };
                            
                            if(n_encores>0)
                            {
                                elementos_encore_printed = document.getElementsByClassName("encore_printed");
                                elementos_composer_encore_printed = document.getElementsByClassName("composer_encore_printed");
                            }

                            

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
                                    text_other += '<br><br> Biography of <a style="color:green">' + this.innerHTML + '</a> in this Wikpedia <a href='+ wiki_link_conductor +'  target="_blank" >link.</a>'
                                }
                                document.getElementById("other_info").innerHTML = text_other;
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
                            //text_other += '<br><br> More information about the piece <a style="color:blue">' + this.innerHTML + '</a> in this Wikpedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                            text_other += '<br><br> More information about the piece in this Wikpedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
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
                            text_other += '<br><br> YouTube link below: <br>  <iframe width="420" height="315" src="' + you_link_piece + '"> </iframe>'
                        }

                        
     

                                    document.getElementById("other_info").innerHTML = text_other;
                                });


                                 // 2. Mouse OUT on PIECE on PROGRAM
                                // elementos_piece_printed[j].addEventListener('mouseout', function handleMouseOut() {
                                //     this.style.color = 'black';// turn back to black 

                                //      // turn back to original color the year  boxes
                                    
                                //     for (let i = 0; i < years_of_this_piece.length; i++) { 
                                //         year_ii = years_of_this_piece[i].year;
                                //         if (year_ii != selected_year){
                                //             $("label[for='" + year_ii + "']").css("background-color", gold_box);
                                //         }
                                //     }
                                    
                                // });
                                
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
                                        var compositor_ii = list_elements[i].getElementsByTagName("a"); 
                                        if(compositor_ii[0].innerHTML == this.innerHTML){
                                            compositor_ii[0].style.color = "red";
                                        }
                                    };

                                    // turn red the same composer appearing in the encores
                                    let list_enc = document.getElementById("list_pieces_encores");    
                                    var list_elements = list_enc.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_encores; i++) {
                                        var compositor_ii = list_elements[i].getElementsByTagName("a"); 
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
                                        var text_other = 'Pieces composed by <em style="color:red">' + this.innerHTML + '</em> were played <strong>' + years_of_this_composer.length + ' times</strong>: ';
                                        
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

                                    text_other += '<br><br> Biography of <em style="color:red">' + this.innerHTML + '</em> in this Wikpedia <a href='+ wiki_link_composer +'  target="_blank" >link.</a>'
                                }
                                    
                                    
                                    
                                    
                                    document.getElementById("other_info").innerHTML = text_other;

                                        


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
                            // text_other += '<br><br> More information about the piece <a style="color:blue">' + this.innerHTML + '</a> in this Wikpedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
                            text_other += '<br><br> More information about the piece in this Wikpedia <a href='+ wiki_link_piece +'  target="_blank" >link.</a>'
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
                            text_other += '<br><br> YouTube link below: <br>  <iframe width="420" height="315" src="' + you_link_piece + '"> </iframe>'
                        }

                                    document.getElementById("other_info").innerHTML = text_other;
                                });



                                


                                 // 6. Mouse OUT on PIECE on ENCORES

                                // elementos_encore_printed[j].addEventListener('mouseout', function handleMouseOut() {
                                //     this.style.color = 'black';// turn back to black 

                                //      // turn back to original color the year  boxes
                                    
                                //     for (let i = 0; i < years_of_this_piece.length; i++) { 
                                //         year_ii = years_of_this_piece[i].year;
                                //         if (year_ii != selected_year){
                                //             $("label[for='" + year_ii + "']").css("background-color", gold_box);
                                //         }
                                //     }
                                    
                                // });
                                
                                 // 7. Mouse CLICK on COMPOSER on ENCORES
                                
                                 elementos_composer_encore_printed[j].addEventListener('click', function handleClick() {
                                    
                                    resetColors()
                                    this.style.color = 'red'; // turn red the composer where you are
                                    
                                    // turn red the same composer appearing in the program
                                    let list = document.getElementById("list_pieces_program");    
                                    var list_elements = list.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_program; i++) {
                                        var compositor_ii = list_elements[i].getElementsByTagName("a"); 
                                        if(compositor_ii[0].innerHTML == this.innerHTML){
                                            compositor_ii[0].style.color = "red";
                                        }
                                    };

                                    // turn red the same composer appearing in the encores
                                    let list_enc = document.getElementById("list_pieces_encores");    
                                    var list_elements = list_enc.getElementsByTagName("li");
                                    
                                    for (let i = 0; i < n_encores; i++) {
                                        var compositor_ii = list_elements[i].getElementsByTagName("a"); 
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
                                         var text_other = 'Pieces composed by <em style="color:red">' + this.innerHTML + '</em> were played <strong>' + years_of_this_composer.length + ' times</strong>: ';
                                        
                                        for (let i = 0; i < years_of_this_composer.length-1; i++) {
                                            let year_ii = years_of_this_composer[i].year;
                                            text_other += '<a style="color:red">' + year_ii + '</a>, '
                                        }
                                        text_other += ' and ' + '<a style="color:red">' + years_of_this_composer[years_of_this_composer.length-1].year + '</a>.';
                                    }
                                    


                                wiki_link_composer = composer_highlighted_item[0].links.wiki.en;


                       
    if (wiki_link_composer.length>0) // non-empty link
    {

        text_other += '<br><br> Biography of <em style="color:red">' + this.innerHTML + '</em> in this Wikpedia <a href='+ wiki_link_composer +'  target="_blank" >link.</a>'
    }
        
        

     
                                    
                                    
                                    document.getElementById("other_info").innerHTML = text_other;

                                        


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



