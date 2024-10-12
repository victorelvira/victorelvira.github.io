float x = -5.91652;
float y = -5.52332;
float z = 24.5723;
float n;
float obs;
float sum_wu;
int speed = 2;
float h = 1e-3;
float S = 10;                
float R = 28;
float B = 8/3;
int N = 10;
int index;
float accum;
float s2_state = h;
float s2_obs = 0.5;
float unif_num;

float xlim_1 = -30;
float xlim_2 = 30;
float ylim_1 = -30;
float ylim_2 = 30;

float x_plot;
float y_plot;
float x_plot_old;
float y_plot_old;
float[] X_part = new float[N];
float[] Y_part = new float[N];
float[] Z_part = new float[N];
float[] X_part_old = new float[N];
float[] Y_part_old = new float[N];
float[] Z_part_old = new float[N];
float[] X_part_res = new float[N];
float[] Y_part_res = new float[N];
float[] Z_part_res = new float[N];


float[] X_part_plot = new float[N];
float[] Y_part_plot = new float[N];
float[] llk= new float[N];
float[] wu = new float[N];
float[] w = new float[N];

int W_paint = 10;
float[] last_x_plot = new float[W_paint];
float[] last_y_plot = new float[W_paint];

int t = 0;

PGraphics trajectory;



void setup() {
  size(1920, 1080);
   
   noStroke();
  smooth();
  background(0);
  trajectory = createGraphics(width, height); 
  trajectory.beginDraw();
  trajectory.noStroke();
  trajectory.fill(0, 100); 
  trajectory.endDraw();
  noCursor();
  frameRate(500);

  for (int n=0; n<N; n++) {
    X_part[n] = -5.91652;
    Y_part[n] = -5.52332;
    Z_part[n] = 24.5723;
  }
}

void draw() {
  
   


t = t + 1;
//text(t, 10, 10);
  // System update
  x = x - h*S*(x-y);//+ sqrt(s2_state)* randomGaussian();
  y = y + h*(R*x-y-x*z);//+ sqrt(s2_state)* randomGaussian();
  z = z + h*(x*y - B*z);//+ sqrt(s2_state)* randomGaussian();        
  obs = x + sqrt(s2_obs)* randomGaussian();

  // Plot System update
  if (t==1) {
    x_plot_old = (x-xlim_1)*width/(xlim_2 - xlim_1);
    y_plot_old = (y-ylim_1)*height/(ylim_2 - ylim_1);
  } else {
    x_plot_old = x_plot;
    y_plot_old = y_plot;
  }
  x_plot = (x-xlim_1)*width/(xlim_2 - xlim_1);
  y_plot = (y-ylim_1)*height/(ylim_2 - ylim_1);


  for (int i = (W_paint - 2); i >= 0; i--) {                
      last_x_plot[i+1] = last_x_plot[i];
      last_y_plot[i+1] = last_y_plot[i];
  }
  last_x_plot[0] = x_plot;
  last_y_plot[0] = y_plot;
  
  // Plot the last adaptation        
  trajectory.beginDraw();
  int period_color = 1000;
//  color c = color(180 + 40*sin(2*PI/period_color*t), 140 + 40*sin(2*PI/period_color*t), 0);
  color c = color(150, 150 , 200 + 40*cos(2*PI/period_color*t));
  trajectory.stroke(c);
  trajectory.line(x_plot_old, y_plot_old, x_plot, y_plot);
  trajectory.endDraw();
   fill(0, 10); // semi-transparent black
   rect(0, 0, width, height);
   
  image(trajectory, 0, 0);

    fill(c);
    ellipse(x_plot, y_plot, 5, 5);
    
  // Particles propagation
  sum_wu = 0;
  for (int n=0; n<N; n++) {
    X_part_old[n] = X_part[n];
    Y_part_old[n] = Y_part[n];
    Z_part_old[n] = Z_part[n];

    X_part[n] = X_part_old[n] - h*S*(X_part_old[n]-Y_part_old[n]) + sqrt(s2_state)* randomGaussian();
    Y_part[n] = Y_part_old[n] + h*(R*X_part[n]-Y_part_old[n]-X_part_old[n]*Z_part_old[n]) + sqrt(s2_state)* randomGaussian();
    Z_part[n] = Z_part_old[n] + h*(X_part_old[n]*Y_part_old[n] - B*Z_part_old[n]) + sqrt(s2_state)* randomGaussian();
  }  

  // Weight calculation
  if (t % 100 == 0) {
    for (int n=0; n<N; n++) {
      llk[n] = -(1/(2*s2_obs))*pow( obs - X_part[n], 2);
      wu[n] = exp( llk[n] - max(llk));
      sum_wu = sum_wu + wu[n];
    }
    // Particles weight normalization
    for (int n=0; n<N; n++) {
      w[n] = wu[n]/sum_wu;
    }

    // Particles resampling 
    for (int n=0; n<N; n++) { // Resampling
      unif_num = random(0, 1);
      index = 0;
      accum = w[0];
      while (unif_num > accum) {
        index = index + 1;
        accum = accum + w[index];
      }
      X_part_res[n] = X_part[index];
      Y_part_res[n] = Y_part[index];
      Z_part_res[n] = Z_part[index];
    }
    X_part = X_part_res;
    Y_part = Y_part_res;
    Z_part = Z_part_res;
    
  }

  // Particles plotting
  for (int n=0; n<N; n++) {
    X_part_plot[n] = (X_part[n]-xlim_1)*width/(xlim_2 - xlim_1);
    Y_part_plot[n] = (Y_part[n]-ylim_1)*height/(ylim_2 - ylim_1);
    stroke(255, 10, 10);
    ellipse(X_part_plot[n], Y_part_plot[n], 1, 1);
  }
  noStroke();
  
  // Plot current state
     fill(255);   
     ellipse(x_plot, y_plot, 8, 8);
    
  int T_save = 5;
  if(t%T_save == 1){
//   saveFrame("/screens/line-######.png");
  }
}