import numpy as np
import matplotlib.pyplot as plt

# Put the path of saving piles
path_ans='./add_ans/'
path_pro='./add_pro/'

# Read hip catalogue
f1=open("hip catalogue.txt",'r')
lines1=f1.readlines()
star_eq, star_hor=[],[]
hip,mag,RA,dec=0,0.,0.,0.
for i,line in enumerate(lines1):
    if i>2:
        b=line[:-2]
        a=b.split('\t')
        hip=int(a[0])
        try:
            mag=float(a[1])
        except:
            mag=float('Nan')
        try:
            RA=float(a[2])
        except:
            RA=float('Nan')
        try:
            dec=float(a[3])
        except:
            dec=float('Nan')
        star_eq.append([hip,mag,RA,dec])
f1.close()

def hip_to_star(hip_number):
    # Open the file and read lines
    with open("hip_with_bayer.dat.txt", 'r') as file:
        lines = file.readlines()
    
    # Iterate through each line to find the matching HIP number
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) >= 2 and parts[0] == str(hip_number):
            # Check if Bayer name is available, if not, return only the HIP number
            if len(parts) == 3 and parts[2]:
                return parts[1] + " " + parts[2]
            else:
                return parts[1]
    
    # If no matching HIP number is found, return None
    return None

#hip:hip카탈로그 넘버; mag:등급; RA:적경; dec:적위

#지평좌표계 좌표값 계산
def deg2rad(x):#degree->rad
    return x*np.pi/180. 
def rad2deg(x): #rad->degree
    return x*180/np.pi
def s_list(loc_lat,loc_long,sol_t,diff,off1,n,m): # 위도, 경도, 태양시, 항성시-태양시, 자전축 돌릴 각도
    sidereal=sol_t-diff #항성시 계산
    sd=sidereal*np.pi/12 #항성시를 hh mm ss(실제 데이터 상에는 hour단위만 표시) -> rad으로 변환
    star_visA=[]
    star_visB=[]
    for star in star_eq:
        h=sd-deg2rad(star[2]) #시간각
        d=deg2rad(star[3]) #적위
        phi=deg2rad(loc_lat) #관측자 위도
        sina=np.cos(h)*np.cos(d)*np.cos(phi)+np.sin(d)*np.sin(phi) #천정거리 -> a는 별의 고도
        cosa=(1-sina*sina)**0.5 
        s1=np.sin(h)*np.cos(d)
        sinA=s1/cosa #A는 별의 방위각
        s2=np.cos(h)*np.cos(d)*np.sin(phi)-np.sin(d)*np.cos(phi)
        cosA=s2/cosa
        sinA,cosA=sinA*np.cos(off1)+cosA*np.sin(off1),cosA*np.cos(off1)-sinA*np.sin(off1) #방위를 랜덤으로 회전시키는 부분 -> 삭제 예정(천올 교육용 남겨둘까)
        r=1.-(np.arcsin(sina)*2/np.pi) #평면 투영 했을 때 천정(원의 중심)에서 얼만큼 떨어져 있는지 그 반지름(극좌표라고 생각하면 됨)
        xco,yco=1.*r*sinA,-1.*r*cosA #평면에서 극좌표로 각 별의 위치 나타내는 것
        star_add=[]

        for i in range(n):
          R=np.random.uniform(0,1)
          Theta=np.random.uniform(0,2*np.pi)
          star_add.append([i,np.random.uniform(1,3),R*np.cos(Theta),R*np.sin(Theta)])
           
        if sina>np.sin(5.*np.pi/180) and star[1]<3.0:#특정 밝기 이상, 천정거리 이상의 별만 선별
            star_visA.append([star[0],star[1],xco,yco])
        elif sina>np.sin(2.*np.pi/180) and star[1]<6.5:
            star_visB.append([star[0],star[1],xco,yco])

    star_vis=np.array(star_visA+star_visB) #나타낼 전체 별
    missing=np.random.choice(len(star_visA),m,replace=False) #임의의 m 개의 별 삭제
    star_visA0 = np.array(star_visA)
    missinglist = star_visA0[missing]
    missingstars = []
    for i in missinglist:
        missingstars.append(int(i[0]))
    return star_vis, missing, missingstars, star_add

def equator(loc_lat,loc_long,sol_t,diff,off1):
    h=np.linspace(0,2*np.pi,2000) #시간각
    phi=deg2rad(loc_lat) #관측자 위도
    sina=np.cos(h)*np.cos(phi) #천정거리 -> a는 별의 고도
    r=1.-(np.arcsin(sina)*2/np.pi) #평면 투영 했을 때 천정(원의 중심)에서 얼만큼 떨어져 있는지 그 반지름(극좌표라고 생각하면 됨)
    cosa=(1-sina*sina)**0.5
    s1=np.sin(h)
    sinA=s1/cosa #A는 별의 방위각
    s2=np.cos(h)*np.sin(phi)
    cosA=s2/cosa
    sinA,cosA=sinA*np.cos(off1)+cosA*np.sin(off1),cosA*np.cos(off1)-sinA*np.sin(off1) #방위를 랜덤으로 회전시키는 부분 -> 삭제 예정(천올 교육용 남겨둘까)
    xco,yco=1.*r*sinA,-1.*r*cosA #평면에서 극좌표로 각 별의 위치 나타내는 것
    xco_new=[]
    yco_new=[]
    for i in range(len(xco)):
      if xco[i]**2+yco[i]**2<=1:
        xco_new.append(xco[i])
        yco_new.append(yco[i])
    return(np.array(xco_new),np.array(yco_new))

def ecliptic(loc_lat,loc_long,sol_t,diff,off1):
    sidereal=sol_t-diff #항성시 계산
    sd=sidereal*np.pi/12 #항성시를 hh mm ss(실제 데이터 상에는 hour단위만 표시) -> rad으로 변환
    lm=np.linspace(0,2*np.pi,2003)
    ep=deg2rad(23.44) #자전축 경사각
    al=np.arctan2(np.sin(lm)*np.cos(ep),np.cos(lm))
    h=sd-al #시간각
    d=np.arcsin(np.sin(ep)*np.sin(lm)) #적위
    phi=deg2rad(loc_lat) #관측자 위도
    sina=np.cos(h)*np.cos(d)*np.cos(phi)+np.sin(d)*np.sin(phi) #천정거리 -> a는 별의 고도
    cosa=(1-sina*sina)**0.5 
    s1=np.sin(h)*np.cos(d)
    sinA=s1/cosa #A는 별의 방위각
    s2=np.cos(h)*np.cos(d)*np.sin(phi)-np.sin(d)*np.cos(phi)
    cosA=s2/cosa
    sinA,cosA=sinA*np.cos(off1)+cosA*np.sin(off1),cosA*np.cos(off1)-sinA*np.sin(off1) #방위를 랜덤으로 회전시키는 부분 -> 삭제 예정(천올 교육용 남겨둘까)
    r=1.-(np.arcsin(sina)*2/np.pi) #평면 투영 했을 때 천정(원의 중심)에서 얼만큼 떨어져 있는지 그 반지름(극좌표라고 생각하면 됨)
    xco,yco=1.*r*sinA,-1.*r*cosA #평면에서 극좌표로 각 별의 위치 나타내는 것
    xco_new=[]
    yco_new=[]
    for i in range(len(xco)):
      if xco[i]**2+yco[i]**2<=1:
        xco_new.append(xco[i])
        yco_new.append(yco[i])
    return(np.array(xco_new),np.array(yco_new))

# n: north, s: south, r: random, #: number
print('latitude(n / s / r / #), longitude(r / #), time(r / #), missing(#), adding(#), number(#)')
ans = input('input: ')
lat_ans = ans.split()[0]
long_ans = ans.split()[1]
time_ans = ans.split()[2]
miss = int(ans.split()[3])
add = int(ans.split()[4])
num = int(ans.split()[5])

missing_stars=[]

for n in range(1, num+1):
  
  #set lat, long, time
  if lat_ans == 'n':
    lat = np.random.uniform(10,80)
  elif lat_ans == 's':
    lat = np.random.uniform(-80,10)
  elif lat_ans == 'r':
    lat = np.random.uniform(-80,80)
  elif -90 < float(lat_ans) and float(lat_ans) < 90:
    lat = float(lat_ans)

  if long_ans == 'r':
    long = np.random.uniform(-180,180)  
  else:
    long = float(long_ans)

  if time_ans == 'r':
    solar_time = np.random.randint(36,60)*0.5
  else:
    solar_time = float(time_ans)

# #save problems
  offset=np.random.rand()
  a,b,c,d = s_list(lat, long, solar_time, 3.35, offset,add,miss)
  fig,ax=plt.subplots(1,1,figsize=(30,30))
  draw_circle=plt.Circle((0.,0.),1.,fill=False)
  ax.add_artist(draw_circle)
  ax.set_xlim(-1,1)
  ax.set_ylim(-1,1)
  for i,star in enumerate(a):
    if i in b:
      continue
    ax.scatter(star[2],star[3],s=300.*10.**(-0.4*star[1]),c='black')

  for i in d:
    ax.scatter(i[2],i[3],s=300.*10.**(-0.4*i[1]),c='black')

  ax.set_title('Pro'+str(n),fontsize=30,loc='left')
  ax.axis('off')
  str_pro=path_pro+'Pro'+str(n)+'.pdf'
  plt.savefig(str_pro)

#save answers
  fig, ax = plt.subplots(1, 1, figsize=(30, 30))
  draw_circle = plt.Circle((0., 0.), 1., fill=False)
  ax.add_artist(draw_circle)
  ax.set_xlim(-1, 1)
  ax.set_ylim(-1, 1)
  eqx, eqy = equator(lat, long, solar_time, 3.35, offset)
  ax.scatter(eqx, eqy, s=4, c='yellow')

  ecx, ecy = ecliptic(lat, long, solar_time, 3.35, offset)
  ax.scatter(ecx, ecy, s=4, c='green')

  for i, star in enumerate(a):
    if i not in b:
      ax.scatter(star[2], star[3], s=300. * 10. ** (-0.4 * star[1]), c='black')
  for i in b:
    star = a[i]
    ax.scatter(star[2], star[3], s=300. * 10. ** (-0.4 * star[1]), c='red')

  for i in d:
    ax.scatter(i[2],i[3],s=300.*10.**(-0.4*i[1]),c='blue')

  sidereal=solar_time - 3.35
  sidereal %= 24
  hours = int(sidereal)
  minutes = int((sidereal - hours) * 60)
  ax.set_title('Ans'+str(n), fontsize=35, loc='left')
  ax.axis('off')
  plt.text(-1,0.96, ', '.join([hip_to_star(i) for i in c]), fontsize=25, color='red')
  plt.text(-1,0.91,"Lat : {:.1f}".format(lat), fontsize=25, color='blue')
  plt.text(-1, 0.86, f"Sid: {hours}h {minutes}m", fontsize=25, color='blue')
  str_ans = path_ans + 'Ans' + str(n) + '.pdf'
  plt.savefig(str_ans)