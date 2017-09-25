using Neo.SmartContract.Framework;
using Neo.SmartContract.Framework.Services.Neo;
using System;
using System.Numerics;

namespace SimpleContract
{
    public class Contract1 : FunctionCode
    {
        public static void Main()
        {
            string a = "aaaa";
            string b = "bbbb";
            int c = 983;

            TestReturnStringOne(a);
            TestReturnStringTwo(a, b);
            TestReturnStringOne("cccc");
            TestReturnStringTwo(a, "dddd");
            TestReturnStringThree();
            TestReturnStringFour();

            TestReturnIntOne(c);
            TestReturnIntOne(43244);


            TestReturnIntTwo();

        }

        public static string TestReturnStringOne(string e)
        {
            return e;
        }

        public static string TestReturnStringTwo(string e, string f)
        {
            return f;
        }

        public static string TestReturnStringThree()
        {
            return "test";
        }

        public static string TestReturnStringFour()
        {
            return TestReturnStringThree();
        }

        public static int TestReturnIntOne(int e)
        {
            return e;
        }


        public static int TestReturnIntTwo()
        {
            return 32;
        }
    }
}
