// type Memo<T> = { get: () => T }
// memo0<T>(f: () => T): Memo<T>
function memo0(f) {
    let r = { evaluated: false };
    return {
        get: function() {
            if (! r.evaluated) {
              r = { evaluated: true, v: f() }
            }
            return r.v;
        },
        toString: function() {
            if (r.evaluated) {
              return r.v.toString();
            } else {   
              return '<unevaluated>';
            }
          }
    };
}

// sempty: Stream<T>
let sempty = {
    isEmpty: () => true,
    map: (f) => sempty,
    filter: (pred) => sempty,
    toString: () => 'sempty'
};
// snode<T>(head: T, tail: Stream<T>): Stream<T>
function snode(head, tail) {
    return {
        isEmpty: () => false,
        head: () => head,
        tail: tail.get,
        map: f => snode(f(head), memo0(() => tail.get().map(f))),
        filter: pred => pred(head) ?
                        snode(head, memo0(() => tail.get().filter(pred)))
                        : tail.get().filter(pred),
        toString: () => "snode(" + head.toString() + ", " + tail.toString() + ")"
    }
}

/* 
1. Write a function addSeries that takes two streams of coefficients for the series s(x) and t(x)
and returns the stream of coefficients for the sum s(x) + t(x).
For example, given 1+2x+3x^(2) +... and 2+6x+9x^(2) +..., 
the result will be 3+8x+12x^(2) +...
*/

//addSeries (seriesS: Stream<T>, seriesT: Stream<T>): Stream<T>
 function addSeries (seriesS, seriesT) {
   if (seriesT.isEmpty()){
     return seriesS;
   } 
   else if (seriesS.isEmpty()){
     return seriesT;
   }  
   else if (seriesS.isEmpty() && seriesT.isEmpty()){
     return sempty;
   }  
   else {
     let headT = seriesT.head();
     let headS = seriesS.head();
     return snode ( headT + headS, memo0(() => addSeries(seriesT.tail(), seriesS.tail())));
   }
 }



/*
2. Write a function prodSeries that takes two streams of coefficients for the series s(x) and t(x)
and returns the stream of coefficients for the product s(x) ⋅ t(x). (Review polynomials)
For example, given 1+2x+3x^(2) +... and 2+6x+9x^(2)+..., 
the result will be 2+10x+27x^(2)+...

Hint: Write one of the series as 𝑠(𝑥) = 𝑎_(0) + xs_(1)(x), where s_(1)(x) is another series. 
Then use distributivity to multiply s(x) ⋅ t(x) and map all operations to streams 
(how can you represent multiplying with x?). 
Delay the recursive computation of the result’s tail until needed.
*/

//prodSeries (seriesS: Stream<T>, seriesT: Stream<T>): Stream<T>
function prodSeries (seriesS, seriesT) {
  if (seriesS.isEmpty()) {
    return seriesS;
  }
  else {
    let currentSeries = seriesT.map(v => seriesS.head()*v);
    return snode(currentSeries.head(), memo0(() => addSeries(currentSeries.tail(), 
    prodSeries(seriesS.tail(), seriesT))));
  }
}


/*
3. Write a function derivSeries that takes a stream of coefficients for the series s(x), 
and returns a stream of coefficients for the derivative s’(x).
For example, given 1+2x+3x^(2)+..., the result will be 2+6x+...,
*/

//derivSeries (seriesS: Stream<T>): Stream<T>
function derivSeries (seriesS) {
  function derivSeriesHelper (constCoeff, seriesS) {
    if (seriesS.isEmpty()) {
      return seriesS;
    }
    else {
      let headS = seriesS.head();
      return snode(headS*constCoeff, memo0(() => derivSeriesHelper(constCoeff += 1, seriesS.tail())));
    }
  }
  let constCoeff = 1;
  return derivSeriesHelper(constCoeff, seriesS.tail());

}


/*
4. Write a function coeff that takes a stream of coefficients for the series s(x) and a natural
number n, and returns the array of coefficients of s(x), up to and including that of order n.
If the stream has fewer coefficients, return as many as there are.
*/

//coeff(seriesS: Stream<T>, num: number): Array[]
function coeff (seriesS, num) {
  let seriesSTemp = seriesS;
  let coeffsArr = [];
  for(let v = 0; v <= num; ++v) {
    coeffsArr.push(seriesSTemp.head());
    seriesSTemp = seriesSTemp.tail();
    if (seriesSTemp.isEmpty()) {
      break;
    }
  }
  return coeffsArr;
}


/*
5. Write a function evalSeries that takes a stream of coefficients for the series s(x), and a
natural number n, and returns a closure. 
When called with a real number x, this closure will
return the sum of all terms of s(x) up to and including the term of order n.
*/

//evalSeries (seriesS: Stream<T>, num: number): number
function evalSeries (seriesS, num) {

  let max = coeff(seriesS, num);
  
  return function (x) {
    let out = 0;
    for (let v = 0; v < max.length; ++v) {
      out = out + (max[v]*Math.pow(x, v));
    }
    return out;
  }
}


/*
6. Write a function applySeries that takes a function f and a value v and returns the stream
representing the infinite series s(x) where 𝑎_(0) = v, and a_(k+1) = f(a_(k)), for all k ≥ 0.
*/

//applySeries (f: number => number, v: number): Stream<T>
function applySeries (f, v) {
  let cF = x => snode (x, memo0(() => cF(f(x))));
  return cF(v);
}


/*
7. Write a function expSeries with no arguments that returns the Taylor series for e^(x), 
i.e., the coefficients are a_(k) = 1/k! You may use applySeries with an appropriate closure.
*/

//expSeries (): Stream<T>
function expSeries() {
  function taylorSeries(x){
    if ( x === 0 || x === 1){
      return 1;
    }
    else {
      return x * taylorSeries(x - 1);
    } 
  }

  function helper(f, val, x){
    ++x;
    return snode( 1/val, memo0(() => helper(f, f(x), x)));
  };
  let soda = snode(1, memo0(() => helper(taylorSeries, taylorSeries(1), 1)));
  return soda;
}


/*
8. Write a function recurSeries, taking two arrays, coef and init, assumed of equal positive
length k, with coef = [c_(0), c_(1), …, c_(k-1)]. 
The function should return the infinite stream of values a_(i)
given by a k-order recurrence: the first k values are given by init: [a_(0), a_(1), …, a_(k-1)];
the following values are given by the relation 
a_(n+k) = (c_(0) * a_(n)) + (c_(1) * a_(n+1)) + ... + (c_(k-1) * a_(n+k-1)) for all n ≥ 0.
*/

//recurSeries (coeff: number[], init: number[]): Stream<T>
function recurSeries (coeff, init) {
  let l = init.length; 
  let c = 0;

  function recurSeriesHelper(c){
    if (c < l){
      return snode(init[c], memo0(() => recurSeriesHelper(++c)));
    }
    else {
      function recurSeriesHelper2(n){
        let ent = 0;

        for (let v = 0; v < l; ++v){
          ent += (coeff[v] * init[v]);
        }

        init.push(ent);
        init.shift()

        return snode(ent, memo0(() => recurSeriesHelper2(++n)));
      }
      let n = 0;
      return recurSeriesHelper2(n);
    }
  }
  return recurSeriesHelper(c);
}


let seriesS = snode(1, memo0(() => snode(2, memo0(() => snode(3, memo0(() => sempty))))));
let seriesT = snode(2, memo0(() => snode(6, memo0(() => snode(9, memo0(() => sempty))))));


test('Function:- addseries', function() {
  let h = addSeries(seriesS, seriesT).head();
  let t1 = addSeries(seriesS, seriesT).tail().head();
  let t2 = addSeries(seriesS, seriesT).tail().tail().head();

  assert( h === 3);
  assert( t1 === 8);
  assert (t2 === 12);
});

test('Function:- prodSeries', function() {
  let h = prodSeries(seriesS, seriesT).head();
  let t1 = prodSeries(seriesS, seriesT).tail().head();
  let t2 = prodSeries(seriesS, seriesT).tail().tail().head();
  let t3 = prodSeries(seriesS, seriesT).tail().tail().tail().head();
  let t4 = prodSeries(seriesS, seriesT).tail().tail().tail().tail().head();

  assert( h === 2);
  assert( t1 === 10);
  assert( t2 === 27);
  assert( t3 === 36);
  assert( t4 === 27);

});

test('Function:- derivSeries', function() {
  let h = derivSeries(seriesS).head();
  let t1 = derivSeries(seriesS).tail().head();

  assert( h === 2);
  assert( t1 === 6);


});

test('Function:- coeff', function() {
  let v = coeff(seriesS, 2);

  assert( v[0] === 1);
  assert( v[1] === 2);
  assert( v[2] === 3);

  let w = coeff(seriesT, 1);

  assert( w[0] === 2);
  assert( w[1] === 6);

});

test('Function:- evalSeries', function() {
  let v = evalSeries(seriesS, 2);
  let g = v(3)

  assert( g === 34);

  let w = evalSeries(seriesT, 1);
  let h = w(5)

  assert( h === 32);

});

test('Function:- applySeries', function() {
  let v = applySeries(x => x + 2, 2);

  assert( v.head() === 2);
  assert( v.tail().head() === 4);
  assert( v.tail().tail().head() === 6);

  let w = applySeries(x => x * x , 5);

  assert( w.head() === 5);
  assert( w.tail().head() === 25);
  assert( w.tail().tail().head() === 625);
});

test('Function:- expSeries', function() {
  let v = expSeries();

  assert( v.head() === 1);
  assert( v.tail().head() === 1);
  assert( v.tail().tail().head() === 1/2);
  assert( v.tail().tail().tail().head() === 1/6);
  assert( v.tail().tail().tail().tail().head() === 1/24);

});

test('Function:- recurSeries', function() {
  let c = [1,1], a = [1,1];

  let v = recurSeries(c,a);

  assert(v.head() === 1);
  assert(v.tail().head() === 1);
  assert(v.tail().tail().head() === 2);
  assert(v.tail().tail().tail().head() === 3);
  assert(v.tail().tail().tail().tail().head() === 5);
  assert(v.tail().tail().tail().tail().tail().head() === 8);
  assert(v.tail().tail().tail().tail().tail().tail().head() === 13);
  assert(v.tail().tail().tail().tail().tail().tail().tail().head() === 21);

});
