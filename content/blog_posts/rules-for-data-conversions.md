Most projects aren’t green field ones. Most projects are integrations or re-implementations. Because of that, almost every non-trivial project has an aspect of data import/export that requires some level of data transformation. For the purpose of this blog entry, I’m calling that whole process “data conversion”.

### **False Beliefs**

It might be tempting to believe that since this conversion is done one time, it’s throw away code and it doesn’t need as much attention as the rest of the project. False!

We can just use these fancy GUI tools to do data exports and imports. Wrong!

### **The Reality**

I believe the best way to think about data conversion is to think about it as a performance of some kind. Would U2 go on stage without a sound check? Could Neil Patrick Harris become Hedwig without hours and hours of practice? No. Of course not.

So why is it that otherwise smart folks believe they can do data conversions without so much as a dress rehearsal? Because they cling to false beliefs.

### Some rules for Data conversion

<h4>1. Manage it as a code asset, just like the other code of your project</h4>

- Use Version Control and iteratively improve it.
- Test it. Test it again. Run it over and over until you get it right.
- Code quality matters because you will need to diagnose the data *after* the conversion; nothing is perfect

<h4>2. Understand how long it takes by running it many times</h4>

- If there is downtime, you will want to know how long

<h4>3. Consider segmenting data into static and dynamic categories</h4>

- Static data can be converted before to save time

<h4>4. Consider Brute Force as an Option</h4>

- There is no shame in making it work

False beliefs cause problems in all areas of life and it’s important to challenge them. The false belief that “this code is throw away” or “it only needs to run once” will make your data conversion suffer.

Data conversion should be managed as part of your code base and tested thoroughly before the actual performance. Make it a priority if you want to have a smooth transition.
